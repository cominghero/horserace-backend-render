# Race Card Scraper - Testing Guide

## 🔴 Current Issue

The online testing environment has **network restrictions** and cannot access external websites. To properly test and debug the scraper, you need to run it on your **local machine**.

---

## ✅ Testing on Your Local Machine

### Step 1: Open Terminal in Backend Directory
```bash
cd e:\My\ Workspace\Freelancer\horseRacing\horseraceBackend
```

### Step 2: Install Dependencies (if not already done)
```bash
npm install
```

### Step 3: Run the Advanced Debug Script

This script will inspect the exact HTML structure of the page and help identify the correct selectors:

```bash
node advanced-debug-scraper.js
```

**What this script does:**
- ✓ Fetches the race card page from Sportsbet
- ✓ Analyzes the HTML structure in detail
- ✓ Shows all direct children and their classes
- ✓ Counts and identifies "racecard-outcome" elements
- ✓ Extracts sample horse data
- ✓ Saves HTML snippet for manual inspection

### Step 4: Test the Race Card Scraper

After inspecting the structure, test the actual scraper:

```bash
node scraper.js race-card "https://www.sportsbet.com.au/horse-racing/australia-nz/ipswich/race-3-9733774"
```

Or use npm script:
```bash
npm run scrape:race-card "https://www.sportsbet.com.au/horse-racing/australia-nz/ipswich/race-3-9733774"
```

### Step 5: Test via API

Start the backend server:
```bash
npm run dev
```

In another terminal, test with curl:
```bash
curl -X POST http://localhost:5000/api/scrape/race-card \
  -H "Content-Type: application/json" \
  -d "{\"raceUrl\":\"https://www.sportsbet.com.au/horse-racing/australia-nz/ipswich/race-3-9733774\"}"
```

Or with PowerShell:
```powershell
$url = "https://www.sportsbet.com.au/horse-racing/australia-nz/ipswich/race-3-9733774"
Invoke-WebRequest -Uri "http://localhost:5000/api/scrape/race-card" `
  -Method POST `
  -ContentType "application/json" `
  -Body "{`"raceUrl`":`"$url`"}"
```

---

## 🐛 Debugging Steps

### If you get 0 horses scraped:

1. **Run the debug script** to see the actual HTML structure
2. **Check the console output** for:
   - How many divs are found in racecardBody
   - Which divs have "racecard-outcome" in the class
   - The structure of the first few horses

3. **If structure differs**, you may need to adjust:
   - Class name patterns (maybe it's `racecard_outcome_` instead of `racecard-outcome-`)
   - Selector paths (div nesting might be different)
   - Text parsing logic

### Common Issues:

**Issue**: "Race card body container not found"
- **Solution**: Check the exact class name in the HTML
- The class might use underscores instead of hyphens

**Issue**: "Successfully scraped 0 horses"
- **Solution**: The nested divs might have different structure
- Run the debug script to inspect the actual hierarchy

**Issue**: Odds are empty/null
- **Solution**: The button/span path might be different
- Inspect sample data in debug output

---

## 📝 Expected Output Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "source": "Sportsbet Australia",
  "raceUrl": "https://www.sportsbet.com.au/horse-racing/australia-nz/ipswich/race-3-9733774",
  "totalHorses": 14,
  "horses": [
    {
      "rank": 1,
      "horseNumber": "1",
      "horseName": "EXAMPLE HORSE",
      "odds": {
        "open": "3.50",
        "fluc1": "3.40",
        "fluc2": "3.30",
        "winFixed": "3.50",
        "placeFixed": "1.80",
        "eachWayFixed": "2.15"
      }
    },
    {
      "rank": 2,
      "horseNumber": "2",
      "horseName": "ANOTHER HORSE",
      "odds": {
        "open": "4.50",
        "fluc1": "4.40",
        "fluc2": "4.30",
        "winFixed": "4.50",
        "placeFixed": "1.90",
        "eachWayFixed": "2.70"
      }
    }
  ]
}
```

---

## 🔧 Files Reference

- **`scraper.js`** - Contains `scrapeRaceCardByUrl()` function
- **`advanced-debug-scraper.js`** - Debug script to inspect HTML structure
- **`test-race-card.js`** - Simple test runner
- **`server.js`** - Contains `/api/scrape/race-card` endpoint

---

## 📞 Next Steps

1. Run the debug script locally and share the output
2. If the structure is different, we can update the selectors
3. Once it works, we can integrate it with the frontend dashboard

---

## ⚙️ Improvements Made

Recent updates to the scraper:
- ✓ More flexible class matching (includes "racecard-outcome" without full suffix)
- ✓ Better horse counting (separate from div index)
- ✓ Enhanced console logging for debugging
- ✓ Better error messages
