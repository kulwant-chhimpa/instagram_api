/**
 * Supabase Storage helper — downloads an image from a URL and uploads
 * it to the configured Supabase Storage bucket.
 */

import { getSupabaseClient } from "./supabase";
import { config } from "./config";
import { ProxyAgent } from "undici";

/**
 * Download an image buffer from a URL.
 * Supports proxy if configured via PROXY_URL environment variable.
 */
async function downloadImage(url: string): Promise<Buffer> {
  // Disable cert verification globally when using proxy (for self-signed certs)
  if (config.proxyUrl && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const fetchOptions: RequestInit & { dispatcher?: any } = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://www.instagram.com/",
    },
  };

  // Add dispatcher (undici proxy agent) if configured
  if (config.proxyUrl) {
    try {
      const dispatcher = new ProxyAgent(config.proxyUrl);
      fetchOptions.dispatcher = dispatcher;
    } catch (err) {
      console.warn("[storage] Failed to create proxy dispatcher:", err);
    }
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload a profile picture to Supabase Storage.
 * Returns the public URL of the stored image.
 *
 * File path: `<username>.jpg` in the configured bucket.
 */
export async function uploadProfilePic(
  username: string,
  imageUrl: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const bucket = config.storageBucket;
  const filePath = `${username}.jpg`;

  // Download the image from Instagram
  const imageBuffer = await downloadImage(imageUrl);

  // Upload (upsert) to Supabase Storage
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, imageBuffer, {
      contentType: "image/jpeg",
      upsert: true, // overwrite on re-fetch
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // Build public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
