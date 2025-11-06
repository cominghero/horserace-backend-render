# Deploy Backend to Render

## Prerequisites

- GitHub/GitLab account
- Render account (free tier works)
- Push your code to a Git repository

## Step-by-Step Deployment

### 1. Push Backend to Git Repository

First, push your backend code to GitHub/GitLab:

```bash
cd horseraceBackend
git init
git add .
git commit -m "Initial backend commit"
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

**OR** if deploying from the main project repository, just ensure `horseraceBackend/` is included.

### 2. Create New Web Service on Render

1. Go to https://render.com/
2. Sign in or create an account
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub/GitLab repository
5. Select your repository

### 3. Configure the Service

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `horse-racing-backend` (or your choice) |
| **Region** | Choose closest to your users |
| **Branch** | `main` (or your default branch) |
| **Root Directory** | `horseraceBackend` (if in monorepo) or leave blank |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

### 4. Add Environment Variables

Click **"Advanced"** and add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `5000` | Render will override this |
| `CORS_ORIGIN` | `*` | Or specific URLs (see below) |

**For specific CORS origins (recommended):**
```
CORS_ORIGIN=http://localhost:8000,https://yourdomain.com
```

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying
3. Wait for deployment to complete (5-10 minutes first time)

### 6. Get Your Backend URL

After deployment:
- Your backend URL will be: `https://horse-racing-backend-xxxx.onrender.com`
- Test it: `https://horse-racing-backend-xxxx.onrender.com/api/health`

### 7. Update Electron App

Update your Electron app to use the deployed backend:

In `horseraceDashboard(electron 22)/electron/main.cjs`:

```javascript
// Add environment variable for backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const BACKEND_PORT = new URL(BACKEND_URL).port || 5000;

// Update backend startup (for local development)
// For production, you might want to skip starting local backend
// and use the Render URL instead
```

Or create an environment variable in your Electron app build:
- `BACKEND_URL=https://your-render-url.onrender.com`

## Important Notes

### Database Storage

⚠️ **Warning**: The free Render tier has **ephemeral storage**. This means:
- Database (`db.json`) will be **reset on every deploy or restart**
- Not suitable for production data storage

**Solutions:**
1. **Use a real database** (recommended):
   - Add PostgreSQL or MongoDB from Render dashboard
   - Update `db.js` to use the database instead of JSON file

2. **Use external storage**:
   - Firebase Realtime Database
   - MongoDB Atlas (free tier)
   - Supabase (free tier)

3. **Keep JSON for testing only** (current setup)

### Puppeteer on Render

Your backend uses Puppeteer for web scraping. On Render:

1. Add this to `package.json` dependencies:
```json
"puppeteer": "^24.26.1"
```

2. Render may need additional configuration for Puppeteer. If you get errors, add this environment variable:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

3. Or use `puppeteer-core` with a Chrome service like Browserless.io

### Free Tier Limitations

- Service **sleeps after 15 minutes** of inactivity
- First request after sleep takes **30-60 seconds** to wake up
- 750 hours/month free (enough for one service)
- Limited to 512 MB RAM

### Keeping Service Awake (Optional)

To prevent sleep, ping your service every 10 minutes:
- Use a service like UptimeRobot (free)
- Ping: `https://your-backend.onrender.com/api/health`

## Testing Your Deployment

Test these endpoints:

```bash
# Health check
curl https://your-backend.onrender.com/api/health

# Get races
curl https://your-backend.onrender.com/api/races

# Get horses
curl https://your-backend.onrender.com/api/horses
```

## Troubleshooting

### Build Failed
- Check build logs in Render dashboard
- Ensure `package.json` is correct
- Verify Node version compatibility

### Service Won't Start
- Check start logs
- Ensure PORT is not hardcoded
- Use `process.env.PORT` in server.js (already done ✓)

### CORS Errors
- Update `CORS_ORIGIN` environment variable
- Add your Electron app's origin

### Database Resets
- Migrate to a persistent database (see notes above)
- Don't rely on `db.json` for production

## Monitoring

In Render Dashboard:
- **Logs**: View real-time logs
- **Metrics**: CPU/Memory usage
- **Events**: Deploy history

## Support

For issues:
1. Check Render logs first
2. Test endpoints with curl/Postman
3. Verify environment variables are set

## Next Steps

After successful deployment:
1. ✅ Update Electron app to use Render URL
2. ✅ Migrate to persistent database (if needed)
3. ✅ Set up monitoring/alerts
4. ✅ Consider upgrading to paid plan for production
