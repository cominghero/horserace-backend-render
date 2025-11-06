# Horse Betting Backend

Simple Express.js backend for the horse betting application.

## Installation

```bash
npm install
```

## Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will run on `http://localhost:5000` by default.

## Running the Web Scrapers

### Completed Races Scraper

To test the Sportsbet racing schedule scraper:

```bash
npm run scrape
```

This will:
1. Fetch the Sportsbet horse racing schedule
2. Parse for Australian racetracks
3. Extract completed races with results
4. Output to console for verification
5. Display formatted JSON output

### Race Card Scraper

To test the race card scraper (extracts horse odds and details):

```bash
npm run scrape:race-card
```

This will:
1. Fetch a race card page from Sportsbet
2. Extract horse numbers, names, and betting odds
3. Parse open odds, fluctuation odds, and fixed odds
4. Output console verification first
5. Display formatted JSON output with all horse data

## API Endpoints

### Health Check
- `GET /api/health` - Check if backend is running

### Web Scraper
- `GET /api/scrape/completed-races` - Scrapes Sportsbet for completed Australian race results
- `POST /api/scrape/race-card` - Scrapes a specific race card URL for horse odds and details
  - **Request body**: `{ "raceUrl": "https://www.sportsbet.com.au/horse-racing/..." }`
  - **Returns**: Array of horses with ranks, numbers, names, and betting odds

### Races
- `GET /api/races` - Get all races
- `GET /api/races/:id` - Get specific race with horses
- `POST /api/races` - Create a new race

### Horses
- `GET /api/horses` - Get all horses
- `GET /api/horses/:id` - Get specific horse
- `POST /api/horses` - Add a new horse to a race

### Bets
- `GET /api/bets` - Get all bets
- `GET /api/bets/:id` - Get specific bet
- `POST /api/bets` - Place a new bet
- `PATCH /api/bets/:id` - Update bet status

## Database

This backend uses **lowDB** for lightweight JSON-based data storage. Data is persisted in `db.json` file automatically.

## Environment Variables

Create a `.env` file based on `.env.example`:

```
PORT=5000
NODE_ENV=development
```

## Deployment to Render

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for complete deployment instructions.

Quick steps:
1. Push code to GitHub/GitLab
2. Create Web Service on Render
3. Set environment variables
4. Deploy!

Your backend URL: `https://your-service.onrender.com`

## Notes

- ⚠️ **Database on Render free tier is ephemeral** (resets on restart)
- First scraping request may be slow (Puppeteer startup)
- Migrate to PostgreSQL/MongoDB for production data persistence

## Next Steps

- ✅ Deploy to Render (see RENDER_DEPLOYMENT.md)
- Connect to persistent database (MongoDB Atlas, PostgreSQL)
- Add authentication/authorization
- Add input validation and error handling
- Set up monitoring and alerts