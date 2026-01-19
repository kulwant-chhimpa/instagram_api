# 🚀 Quick Start Guide

## Installation & Setup (2 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

Server will start on `http://localhost:3000`

---

## 🎯 Test It Now!

### Option 1: Use the Web Demo
Open your browser and go to:
```
http://localhost:3000/demo
```

### Option 2: Test with cURL
```bash
# Search for a username
curl "http://localhost:3000/ig-search?username=instagram"

# Test with another username
curl "http://localhost:3000/ig-search?username=cristiano"

# Test non-existent user
curl "http://localhost:3000/ig-search?username=doesnotexist123"

# Check cache stats
curl "http://localhost:3000/cache/stats"
```

### Option 3: Run the Test Suite
```bash
node test.js
```

---

## 📡 API Usage

### Endpoint
```
GET /ig-search?username={USERNAME}
```

### Example Request (JavaScript)
```javascript
const response = await fetch('http://localhost:3000/ig-search?username=instagram');
const data = await response.json();

if (data.exists) {
  console.log(`Followers: ${data.followers}`);
  console.log(`Profile: ${data.profilePic}`);
}
```

### Response Format
```json
{
  "exists": true,
  "username": "instagram",
  "fullName": "Instagram",
  "profilePic": "https://...",
  "followers": 698885428,
  "following": 179,
  "posts": 8305,
  "isVerified": true,
  "isPrivate": false,
  "biography": "..."
}
```

---

## 🎛️ Configuration

Edit these values in `server.js`:

```javascript
const PORT = 3000;                        // Server port
const CACHE_TTL = 1000 * 60 * 60 * 12;  // 12 hours
```

---

## 📦 Project Structure

```
instagram_api/
├── server.js          # Main Express server (IMPORTANT)
├── package.json       # Dependencies
├── demo.html          # Web demo interface
├── test.js            # Test suite
├── README.md          # Full documentation
└── QUICKSTART.md      # This file
```

---

## 🔥 What Makes This Great?

✅ **No login required** - Uses Instagram's public endpoint  
✅ **Smart caching** - Responses cached for 12 hours  
✅ **Rate limited** - Prevents abuse (30 req/min)  
✅ **Error handling** - Graceful handling of edge cases  
✅ **Production ready** - Handles 100-1000 requests/day easily  

---

## 🐛 Troubleshooting

**Server won't start?**
- Make sure port 3000 is available
- Check if Node.js 18+ is installed: `node --version`

**API returns "exists: false" for valid users?**
- Instagram might be rate limiting (rare at this scale)
- Try again in a few seconds
- Clear cache: `curl -X POST http://localhost:3000/cache/clear`

**Demo page can't connect?**
- Make sure server is running: `curl http://localhost:3000/`
- Check browser console for CORS errors

---

## 🚀 Deploy to Production

### Option 1: Railway (Easiest)
1. Push to GitHub
2. Connect to Railway
3. Deploy automatically

### Option 2: Render
1. Push to GitHub
2. Create new Web Service
3. Set start command: `node server.js`

### Option 3: Docker
```bash
# Build image
docker build -t instagram-api .

# Run container
docker run -p 3000:3000 instagram-api
```

---

## 📞 Need Help?

- Check the full [README.md](README.md) for detailed documentation
- Run `node test.js` to verify everything works
- Open `/demo` in browser for visual testing

---

**That's it! You're ready to search Instagram usernames! 🎉**
