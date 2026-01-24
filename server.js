import express from "express";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'instagram-profiles';

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✓ Supabase initialized');
} else {
  console.warn('⚠ Supabase credentials not found. Profile picture storage disabled.');
}

// Configuration
const PORT = process.env.PORT || 3000;
const CACHE_TTL = 1000 * 60 * 60 * 12; // 12 hours in milliseconds
const INSTAGRAM_API_URL = "https://www.instagram.com/api/v1/users/web_profile_info/";
const IG_APP_ID = "936619743392459"; // Instagram's public app ID

// In-memory cache: Map<username, { data, expiry }>
// Stores Instagram profile data to reduce API calls and improve response time
const cache = new Map();

// Rate limiter: Prevents abuse by limiting requests per IP
// 30 requests per minute per IP address
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // Max 30 requests per window
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Apply rate limiter to the search endpoint
app.use("/ig-search", limiter);

// Enable JSON parsing for request bodies (optional, for future POST endpoints)
app.use(express.json());

// Enable CORS for all routes (allows frontend to call API)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

/**
 * Download profile picture from URL and upload to Supabase Storage
 * @param {string} imageUrl - Instagram profile picture URL
 * @param {string} username - Instagram username
 * @returns {Promise<string>} - Supabase public URL or original URL on failure
 */
async function uploadProfilePictureToSupabase(imageUrl, username) {
  if (!supabase || !imageUrl) {
    return imageUrl; // Return original URL if Supabase not configured
  }

  try {
    console.log(`[SUPABASE] Uploading profile picture for ${username}...`);
    
    // Download the image from Instagram
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `${username}-${timestamp}.jpg`;
    const filePath = `profiles/${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
        cacheControl: '3600' // Cache for 1 hour
      });
    
    if (error) {
      console.error(`[SUPABASE ERROR] ${username}:`, error.message);
      return imageUrl; // Return original URL on error
    }
    
    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log(`[SUPABASE SUCCESS] ${username} → ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
    
  } catch (error) {
    console.error(`[SUPABASE ERROR] Failed to upload ${username}:`, error.message);
    return imageUrl; // Fallback to original URL
  }
}

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Instagram Username Search API with Supabase Storage",
    supabase: supabase ? "✓ Connected" : "✗ Not configured",
    bucket: bucketName,
    endpoints: {
      search: "/ig-search?username=USERNAME",
      demo: "/demo",
      cacheStats: "/cache/stats"
    }
  });
});

/**
 * Main endpoint: Search Instagram username
 * GET /ig-search?username=USERNAME
 * 
 * Returns profile information if user exists, or { exists: false } if not found
 */
app.get("/ig-search", async (req, res) => {
  // Step 1: Validate username parameter
  const username = req.query.username?.toLowerCase().trim();
  
  if (!username) {
    return res.status(400).json({
      error: "username parameter is required",
      example: "/ig-search?username=instagram",
    });
  }

  // Step 2: Check cache first to avoid unnecessary API calls
  const cached = cache.get(username);
  if (cached && cached.expiry > Date.now()) {
    console.log(`[CACHE HIT] ${username}`);
    return res.json(cached.data);
  }

  // Step 3: Fetch from Instagram's public API
  try {
    console.log(`[FETCHING] ${username}`);
    
    const response = await fetch(
      `${INSTAGRAM_API_URL}?username=${username}`,
      {
        headers: {
          // Required headers to mimic a browser request
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "X-IG-App-ID": IG_APP_ID,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    // Step 4: Handle non-200 responses (user doesn't exist or API error)
    if (!response.ok) {
      console.log(`[NOT FOUND] ${username} - Status: ${response.status}`);
      // Try to get error details
      try {
        const errorText = await response.text();
        console.log(`[ERROR DETAILS] ${username}: ${errorText.substring(0, 200)}`);
      } catch (e) {}
      return res.json({ exists: false });
    }

    // Step 5: Parse JSON response
    const json = await response.json();
    const user = json?.data?.user;

    // Step 6: Validate user data exists
    if (!user) {
      console.log(`[NO DATA] ${username}`);
      return res.json({ exists: false });
    }

    // Step 7: Extract profile picture and upload to Supabase
    let profilePicUrl = user.profile_pic_url_hd || user.profile_pic_url;
    let supabaseImage = false;
    
    if (profilePicUrl && supabase) {
      const supabaseUrl = await uploadProfilePictureToSupabase(profilePicUrl, username);
      if (supabaseUrl !== profilePicUrl) {
        profilePicUrl = supabaseUrl;
        supabaseImage = true;
      }
    }

    // Step 8: Extract and format the data we need
    const data = {
      imageUrl: profilePicUrl,  // Supabase image URL
      followers: user.edge_followed_by?.count || 0,
      following: user.edge_follow?.count || 0,
    };

    // Step 9: Store in cache with expiry timestamp
    cache.set(username, {
      data,
      expiry: Date.now() + CACHE_TTL,
    });

    console.log(`[SUCCESS] ${username}`);
    
    // Step 10: Return the profile data
    res.json(data);

  } catch (error) {
    // Step 11: Handle any errors (network issues, timeouts, etc.)
    console.error(`[ERROR] ${username}:`, error.message);
    console.error(`[ERROR STACK] ${error.stack}`);
    
    res.status(500).json({
      exists: false,
      error: "Failed to fetch Instagram profile",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Debug endpoint to test Instagram API connectivity
app.get("/debug/instagram", async (req, res) => {
  try {
    console.log("[DEBUG] Testing Instagram API...");
    const response = await fetch(
      `${INSTAGRAM_API_URL}?username=instagram`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "X-IG-App-ID": IG_APP_ID,
        },
        timeout: 10000,
      }
    );
    
    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: `${INSTAGRAM_API_URL}?username=instagram`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      type: error.constructor.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Cache management endpoint (optional, for debugging)
app.get("/cache/stats", (req, res) => {
  res.json({
    entries: cache.size,
    usernames: Array.from(cache.keys()),
  });
});

// Clear cache endpoint (optional, for maintenance)
app.post("/cache/clear", (req, res) => {
  cache.clear();
  res.json({ message: "Cache cleared successfully" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  Instagram API with Supabase Storage      ║
╠════════════════════════════════════════════╣
║  Port: ${PORT}                              
║  Supabase: ${supabase ? '✓ Connected' : '✗ Not configured'}                     
║  Bucket: ${bucketName}             
║  API: /ig-search?username=USERNAME        ║
║  Frontend: http://localhost:${PORT}/       
║  Cache TTL: 12 hours                      ║
║  Rate Limit: 30 requests/minute           ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  cache.clear();
  process.exit(0);
});
