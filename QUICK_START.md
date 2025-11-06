# Race Card Scraper - Quick Start Guide

## 🚀 30-Second Setup

```bash
# Go to backend folder
cd horseraceBackend

# Start backend
npm run dev

# In another terminal, test it:
curl -X POST http://localhost:5000/api/scrape/race-card \
  -H "Content-Type: application/json" \
  -d '{"raceUrl":"https://www.sportsbet.com.au/horse-racing/australia-nz/ipswich/race-3-9733774"}'
```

---

## 📚 Available Commands

```bash
# Test scraper directly
npm run scrape:race-card

# Debug HTML structure (BEST FOR DIAGNOSING ISSUES)
npm run debug:race-card

# Test alternative parsing strategies
npm run test:strategies

# Start API server
npm run dev

# Start API server (production)
npm start
```

---

## 🎯 What You're Getting

### Function
```javascript
scrapeRaceCardByUrl(url)
```
Fetches a race card page and extracts:
- 🐴 Horse numbers
- 📝 Horse names  
- 🏆 Rankings
- 💰 Betting odds (open, fluctuation, fixed)

### API Endpoint
```
POST /api/scrape/race-card
```

### Example Response
```json
{
  "totalHorses": 14,
  "horses": [
    {
      "rank": 1,
      "horseNumber": "1",
      "horseName": "HORSE NAME",
      "odds": {
        "open": "3.50",
        "fluc1": "3.40",
        "fluc2": "3.30",
        "winFixed": "3.50",
        "placeFixed": "1.80",
        "eachWayFixed": "2.15"
      }
    }
  ]
}
```

---

## ⚠️ Important Note

The **online testing environment cannot access external websites**.

**Test on your local machine!** The scraper is fully implemented and ready - you just need to run it where you have internet access.

---

## 🔧 If It Returns 0 Horses

The HTML structure might be different than expected:

1. Run: `npm run debug:race-card`
2. Check the console output for:
   - Number of divs found
   - Whether "racecard-outcome" elements exist
   - The actual HTML structure
3. Share the output if you need adjustments

---

## 📖 Full Documentation

- **TESTING_GUIDE.md** - Complete testing steps
- **RACE_CARD_SCRAPER_SUMMARY.md** - Full implementation details
- **QUICK_START.md** - This file

---

## 💻 Files

```
scraper.js                  ← Main scraper function
advanced-debug-scraper.js   ← HTML inspector
scraper-alternative.js      ← Backup strategies
server.js                   ← API endpoint
package.json               ← npm scripts
```

---

**Ready to test?** Run `npm run debug:race-card` on your local machine! 🚀