const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');

const SPORTSBET_URL = 'https://www.sportsbet.com.au/racing-schedule/horse/today';
const LOGS_DIR = path.join(__dirname, 'logs');

const PROXY_IP = process.env.PROXY_IP || '54.79.7.182';
const PROXY_PORT = process.env.PROXY_PORT || '3128';
const PROXY_URL = `http://${PROXY_IP}:${PROXY_PORT}`;

const httpAgent = new HttpProxyAgent(PROXY_URL);
const httpsAgent = new HttpsProxyAgent(PROXY_URL);

/**
 * Fetch HTML content using native fetch
 * @param {string} url - The URL to fetch
 * @param {number} retries - Number of retry attempts (default: 2)
 * @returns {Promise<string>} The HTML content
 */
async function fetchHTML(url, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${retries} for ${url}`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      const response = await axios.get(url, {
        httpAgent: httpAgent,
        httpsAgent: httpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      return response.data;

    } catch (error) {
      lastError = error;

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        console.error(`❌ Fetch error for ${url} after ${retries + 1} attempts:`, error.message);
        throw error;
      }
    }
  }

  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Ensure logs directory exists
 */
function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Log scraping results to a text file
 * @param {Array} allRacetracksData - All scraped race data
 * @param {number} totalRaceCount - Total races scraped
 */
function logScrapingResults(allRacetracksData, totalRaceCount) {
  try {
    ensureLogsDir();
    
    const timestamp = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString('en-AU').replace(/\//g, '-');
    const timeStr = new Date().toLocaleTimeString('en-AU').replace(/:/g, '-');
    const filename = `scraping-results-${dateStr}_${timeStr}.txt`;
    const filepath = path.join(LOGS_DIR, filename);
    
    let logContent = `HORSE RACING SCRAPING RESULTS LOG\n`;
    logContent += `${'='.repeat(70)}\n`;
    logContent += `Timestamp: ${timestamp}\n`;
    logContent += `Total Racetracks: ${allRacetracksData.length}\n`;
    logContent += `Total Races Scraped: ${totalRaceCount}\n`;
    logContent += `${'='.repeat(70)}\n\n`;
    
    // Log details for each racetrack
    allRacetracksData.forEach((trackData, trackIndex) => {
      const { racetrack, tracklinkUrl, completedRaces } = trackData;
      
      logContent += `\n[${trackIndex + 1}] RACETRACK: ${racetrack}\n`;
      logContent += `-`.repeat(70) + `\n`;
      logContent += `Track URL: ${tracklinkUrl}\n`;
      logContent += `Total Races: ${completedRaces.length}\n\n`;
      
      // Log each race
      completedRaces.forEach((race, raceIndex) => {
        const { raceNumber, result, link, horses, horseCount } = race;
        
        logContent += `  ${raceNumber}. Result: ${result} | Horses: ${horseCount}\n`;
        logContent += `     Link: ${link}\n`;
        
        // Log horses for this race
        if (horses && horses.length > 0) {
          logContent += `     Horses:\n`;
          horses.forEach((horse) => {
            const { rank, horseNumber, horseName, odds } = horse;
            const placeOdds = odds?.placeFixed || 'N/A';
            logContent += `       - [${rank}] #${horseNumber} ${horseName} (Place: ${placeOdds})\n`;
          });
        }
        
        logContent += `\n`;
      });
    });
    
    // Write to file
    fs.writeFileSync(filepath, logContent, 'utf-8');
    console.log(`📄 Scraping results logged to: ${filepath}`);
    
    return filepath;
  } catch (error) {
    console.error('❌ Error logging scraping results:', error.message);
  }
}

/**
 * Log completed races to a text file
 * @param {Array} completedRacesData - Result from scrapeCompletedRaces()
 * @returns {string} Path to the log file
 */
function logCompletedRaces(completedRacesData) {
  try {
    ensureLogsDir();
    
    const timestamp = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString('en-AU').replace(/\//g, '-');
    const timeStr = new Date().toLocaleTimeString('en-AU').replace(/:/g, '-');
    const filename = `completed-races-${dateStr}_${timeStr}.txt`;
    const filepath = path.join(LOGS_DIR, filename);
    
    let logContent = `COMPLETED RACES LOG\n`;
    logContent += `${'='.repeat(80)}\n`;
    logContent += `Timestamp: ${timestamp}\n`;
    logContent += `Total Racetracks: ${completedRacesData.length}\n`;
    logContent += `${'='.repeat(80)}\n\n`;
    
    // Calculate total races
    let totalRaceCount = 0;
    completedRacesData.forEach(track => {
      totalRaceCount += track.completedRaces.length;
    });
    logContent += `Total Races: ${totalRaceCount}\n\n`;
    
    // Log details for each racetrack
    completedRacesData.forEach((trackData, trackIndex) => {
      const { racetrack, country, tracklinkUrl, completedRaces } = trackData;
      
      logContent += `\n[${ trackIndex + 1}] RACETRACK: ${racetrack}\n`;
      logContent += `-`.repeat(80) + `\n`;
      logContent += `Country: ${country}\n`;
      logContent += `Track URL: ${tracklinkUrl}\n`;
      logContent += `Total Races: ${completedRaces.length}\n\n`;
      
      // Log each race
      completedRaces.forEach((race, raceIndex) => {
        const { raceNumber, result, link } = race;
        
        logContent += `  ${raceNumber}. Result: ${result}\n`;
        logContent += `     Link: ${link || 'N/A'}\n\n`;
      });
    });
    
    // Write to file
    fs.writeFileSync(filepath, logContent, 'utf-8');
    console.log(`📄 Completed races logged to: ${filepath}`);
    
    return filepath;
  } catch (error) {
    console.error('❌ Error logging completed races:', error.message);
  }
}

/**
 * Scrapes completed race results from Sportsbet
 * @returns {Promise<Array>} Array of racetracks with completed results
 */
async function scrapeCompletedRaces() {
  try {
    console.log('Fetching racing schedule from Sportsbet...');

    // Fetch HTML content from Sportsbet
    const html = await fetchHTML(SPORTSBET_URL);

    const $ = cheerio.load(html);
    const results = [];

    // Find all tr tags (racetrack rows)
    const rows = $('tr');
    
    rows.each((index, row) => {
      const $row = $(row);
      
      // Get the first td which contains the track info
      const firstTd = $row.find('td').first();
      const countrySpan = firstTd.find('a > div > div > div > span').text().trim();
      
      // Only process Australian racetracks
      if (countrySpan !== 'Australia') {
        return; // Skip this row
      }

      // Get the track name
      const trackName = firstTd.find('a > div > div > span').text().trim();
      // let trackName = '';

      // trackNameElement.contents().each((i, node) => {
      //   if (node.type === 'text') {
      //     trackName = $(node).text().trim();
      //   }
      // });

      // Get the track link
      const trackLink = firstTd.find('a').attr('href');

      // Get all race cells (td elements after the first one)
      const raceCells = $row.find('td').slice(1);
      const completedRaces = [];

      raceCells.each((cellIndex, cell) => {
        const $cell = $(cell);
        let raceFoundInCell = false; // Flag to prevent duplicate adds per cell
        
        // Look for race results (numbers separated by commas)
        // Results are in: div > div (second div) > div > div
        const resultDivs = $cell.find('div > div');
        
        resultDivs.each((divIndex, div) => {
          if (raceFoundInCell) return; // Skip if already found a race in this cell
          
          const $div = $(div);
          
          // Check if this div contains two sub-divs
          const subDivs = $div.find('> div');
          if (subDivs.length >= 2) {
            // The second sub-div might contain results
            const secondDiv = subDivs.eq(1);
            const resultText = secondDiv.text().trim();
            
            // Check if it matches the pattern of race results (e.g., "4,5,3")
            if (isRaceResult(resultText)) {
              const raceLink = $cell.find('a').attr('href');
              // Extract actual race number from URL (e.g., "race-7-9759417" → "R7")
              const raceNumberMatch = raceLink ? raceLink.match(/race-(\d+)/i) : null;
              const raceNumber = raceNumberMatch ? `R${raceNumberMatch[1]}` : 'N/A';
              
              completedRaces.push({
                raceNumber: raceNumber,
                result: resultText,
                link: raceLink || null
              });
              raceFoundInCell = true; // Mark that we found a race in this cell
            }
          }
        });

        // Alternative: Check direct text content for results (only if nested check didn't find anything)
        if (!raceFoundInCell) {
          const cellText = $cell.text().trim();
          if (isRaceResult(cellText)) {
            const raceLink = $cell.find('a').attr('href');
            // Extract actual race number from URL (e.g., "race-7-9759417" → "R7")
            const raceNumberMatch = raceLink ? raceLink.match(/race-(\d+)/i) : null;
            const raceNumber = raceNumberMatch ? `R${raceNumberMatch[1]}` : 'N/A';
            
            completedRaces.push({
              raceNumber: raceNumber,
              result: cellText,
              link: raceLink || null
            });
          }
        }
      });

      // Only add if there are completed races
      if (completedRaces.length > 0) {
        results.push({
          racetrack: trackName,
          country: countrySpan,
          tracklinkUrl: trackLink,
          completedRaces: completedRaces
        });
      }
    });    
    return results;
  } catch (error) {
    console.error('Error scraping Sportsbet:', error.message);
    throw error;
  }
}

/**
 * Check if text matches race result pattern (numbers separated by commas)
 * @param {string} text
 * @returns {boolean}
 */
function isRaceResult(text) {
  // Pattern: numbers separated by commas (e.g., "4,5,3" or "1,2,3")
  return /^\d+,\d+,\d+$/.test(text);
}

/**
 * Scrapes race card data from a specific race URL
 * Extracts horse numbers, names, ranks, and betting odds
 * @param {string} raceUrl - The race card URL to scrape (can be relative or absolute)
 * @returns {Promise<Array>} Array of horse data with odds
 */
async function scrapeRaceCardByUrl(raceUrl) {
  try {
    // Convert relative URL to full URL if needed
    const fullUrl = raceUrl.startsWith('http')
      ? raceUrl
      : `https://www.sportsbet.com.au${raceUrl}`;

    // Use simple axios fetch - race card data is in HTML, no JS rendering needed
    const response = await axios.get(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = response.data;

    const $ = cheerio.load(html);
    const horses = [];

    // Find all horse outcome containers
    // Each horse is in a div with data-automation-id="racecard-outcome-*"
    const horseContainers = $('div[data-automation-id^="racecard-outcome-"]').filter(function() {
      return $(this).find('div[data-automation-id="racecard-outcome-name"]').length > 0;
    });
    // console.log(horseContainers.length);
    
    // if (horseContainers.length === 0) {
    //   console.warn('⚠️ No horse containers found');
    //   return horses;
    // }
    
    // console.log(`✅ Found ${horseContainers.length} horses`);

    let horseCount = 0;
    horseContainers.each((index, container) => {
      const $container = $(container);
      
      // ========== HORSE NUMBER AND NAME ==========
      // Located in: div[data-automation-id="racecard-outcome-name"] > span:first
      const nameSpan = $container.find('div[data-automation-id="racecard-outcome-name"] > span').first();
      const horseInfoText = nameSpan.text().trim();
      
      let horseNumber = '';
      let horseName = '';
      
      const horseMatch = horseInfoText.match(/^(\d+)\.\s+(.+)$/);
      if (horseMatch) {
        horseNumber = horseMatch[1];
        horseName = horseMatch[2].trim();
      } else {
        console.warn(`⚠️ Could not parse horse info: "${horseInfoText}"`);
        return; // Skip this horse
      }

      horseCount++;
      const rank = horseCount;

      // ========== FLUCTUATING ODDS ==========
      // Located in: div[class*="priceFlucsContainer_"] > span (3 spans)
      const flucContainer = $container.find('div[class*="priceFlucsContainer_"]');
      const flucSpans = flucContainer.find('> span');
      
      let open = '0.00';
      let fluc1 = '0.00';
      let fluc2 = '0.00';
      
      if (flucSpans.length >= 1) {
        const openText = $(flucSpans[0]).text().trim();
        const openMatch = openText.match(/(\d+[.,]\d{1,2})/);
        if (openMatch) open = openMatch[1].replace(',', '.');
      }
      if (flucSpans.length >= 2) {
        const fluc1Text = $(flucSpans[1]).text().trim();
        const fluc1Match = fluc1Text.match(/(\d+[.,]\d{1,2})/);
        if (fluc1Match) fluc1 = fluc1Match[1].replace(',', '.');
      }
      if (flucSpans.length >= 3) {
        const fluc2Text = $(flucSpans[2]).text().trim();
        const fluc2Match = fluc2Text.match(/(\d+[.,]\d{1,2})/);
        if (fluc2Match) fluc2 = fluc2Match[1].replace(',', '.');
      }

      // ========== JOCKEY NAME ==========
      // Located in: span[data-automation-id="racecard-outcome-info-jockey"]
      const jockeySpan = $container.find('span[data-automation-id="racecard-outcome-info-jockey"]');
      let jockey = 'N/A';

      if (jockeySpan.length > 0) {
        const jockeyText = jockeySpan.text().trim();
        // Format is "J: John Allen", extract just the name
        const jockeyMatch = jockeyText.match(/^J:\s*(.+)$/);
        if (jockeyMatch) {
          jockey = jockeyMatch[1].trim();
        }
      }

      // ========== FIXED ODDS ==========
      // Located in: div[class*="priceContainer_"] > div[data-automation-id*="L-price"]
      // Each has button > div > div > div > span (inside the button)
      const fixedContainer = $container.find('div[class*="priceContainer_"]');
      const priceDivs = fixedContainer.find('> div[data-automation-id*="L-price"]');
      
      let winFixed = '0.00';
      let placeFixed = '0.00';
      let eachWayFixed = '0.00';
      
      // Extract from first price div (WIN)
      if (priceDivs.length >= 1) {
        const winSpan = $(priceDivs[0]).find('button span[data-automation-id*="odds-button-text"]').first();
        if (winSpan.length > 0) {
          const winText = winSpan.text().trim();
          const winMatch = winText.match(/(\d+[.,]\d{1,2})/);
          if (winMatch) winFixed = winMatch[1].replace(',', '.');
        }
      }
      
      // Extract from second price div (PLACE)
      if (priceDivs.length >= 2) {
        const placeSpan = $(priceDivs[1]).find('button span[data-automation-id*="odds-button-text"]').first();
        if (placeSpan.length > 0) {
          const placeText = placeSpan.text().trim();
          const placeMatch = placeText.match(/(\d+[.,]\d{1,2})/);
          if (placeMatch) placeFixed = placeMatch[1].replace(',', '.');
        }
      }
      
      // Extract from third price div (EACH WAY)
      if (priceDivs.length >= 3) {
        const ewSpan = $(priceDivs[2]).find('button span[data-automation-id*="odds-button-text"]').first();
        if (ewSpan.length > 0) {
          const ewText = ewSpan.text().trim();
          // Each way might show "EW" instead of odds, so handle that
          const ewMatch = ewText.match(/(\d+[.,]\d{1,2})/);
          if (ewMatch) eachWayFixed = ewMatch[1].replace(',', '.');
        }
      }

      // Build horse object (same output structure)
      const horseData = {
        rank,
        horseNumber,
        horseName,
        jockey,
        odds: {
          open,
          fluc1,
          fluc2,
          winFixed,
          placeFixed,
          eachWayFixed
        }
      };

      horses.push(horseData);
    });

    console.log(`\n✅ Successfully scraped ${horses.length} horses from race card\n`);
    return horses;

  } catch (error) {
    console.error('❌ Error scraping race card:', error.message);
    throw error;
  }
}

/**
 * Extract race date/time from the results header
 * Looks for: <div data-automation-id="results-header">...<span>19 Oct 10:47</span></div>
 *
 * NOTE: This function often returns null because Sportsbet uses JavaScript to render times.
 * The results-header element is not present in static HTML for most races.
 * Times will default to 'TBD' when this fails.
 *
 * @param {string} raceUrl - The race URL to fetch
 * @returns {Promise<string>} Race date (e.g., "19 Oct 10:47") or null if not found
 */
async function extractRaceDateFromUrl(raceUrl) {
  try {
    // Convert relative URL to full URL if needed
    const fullUrl = raceUrl.startsWith('http') 
      ? raceUrl 
      : `https://www.sportsbet.com.au${raceUrl}`;
    
    const response = await axios.get(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Find the header with data-automation-id="results-header"
    const headerDiv = $('div[data-automation-id="results-header"]');
    
    if (headerDiv.length === 0) {
      console.warn('⚠️ Header not found');
      return null;
    }
    
    // Get all direct child divs (class names are dynamically generated, so match by position)
    const headerCells = headerDiv.find('> div');
    
    if (headerCells.length < 2) {
      console.warn('⚠️ Date cell not found (found', headerCells.length, 'cells)');
      return null;
    }
    
    // Get the second headerCell's span text (index 1 = second div)
    const dateText = $(headerCells[1]).find('span').text().trim();
    
    return dateText || null;
  } catch (error) {
    console.error('❌ Error extracting race date:', error.message);
    return null;
  }
}

/**
 * Extract time from race date-time string
 * Converts "19 Oct 3:43" to "3:43" or "19 Oct 10:47" to "10:47"
 * @param {string} dateTimeStr - The date-time string from results header
 * @returns {string} Time in HH:MM format, or 'N/A' if extraction fails
 */
function extractTimeFromDateTime(dateTimeStr) {
  if (!dateTimeStr) return 'N/A';
  
  try {
    // Match pattern like "3:43" or "10:47" (time at the end)
    const timeMatch = dateTimeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}`;
    }
    return 'N/A';
  } catch (error) {
    console.warn(`⚠️ Error extracting time from "${dateTimeStr}": ${error.message}`);
    return 'N/A';
  }
}

/**
 * Format race card results for JSON output
 * @param {Array} horses - Array of horse data
 * @param {string} raceUrl - The race URL
 * @param {string} raceDate - The race date/time (e.g., "19 Oct 10:47")
 * @returns {object}
 */
function formatRaceCardAsJSON(horses, raceUrl, raceDate = null) {
  return {
    timestamp: new Date().toISOString(),
    source: 'Sportsbet Australia',
    raceUrl,
    totalHorses: horses.length,
    ...(raceDate && { date: raceDate }),
    horses
  };
}

/**
 * Scrape all completed races and their race cards
 * Returns array of {raceUrl, horses[]} and saves to database
 * @param {object} db - Database instance (optional, for saving data)
 * @returns {Promise<Array>} Array of races with horse data
 */
async function scrapeAllCompletedRacesWithCards(db = null) {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  SCRAPING ALL COMPLETED RACES         ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Step 1: Get all completed races with structure: racetrack, completedRaces array
    console.log('📍 Step 1: Fetching completed races...');
    const completedRacesData = await scrapeCompletedRaces();
    
    console.log(`✅ Found ${completedRacesData.length} racetracks\n`);
    
    // Log completed races to file
    logCompletedRaces(completedRacesData);

    // Step 2: For each racetrack, scrape race cards for each race
    console.log('📍 Step 2: Scraping race cards for each race...\n');
    
    const allRacetracksData = [];
    let totalRaceCount = 0;

    for (const trackData of completedRacesData) {
      const { racetrack, tracklinkUrl, completedRaces } = trackData;
      
      console.log(`\n🏇 Processing: ${racetrack}`);
      
      // Scrape horses for each race in this racetrack
      const completedRacesWithHorses = [];
      
      for (let i = 0; i < completedRaces.length; i++) {
        const race = completedRaces[i];
        const { raceNumber, result, link } = race;
        
        try {
          console.log(`  [${i + 1}/${completedRaces.length}] ${raceNumber}: ${result}`);
          
          // Extract race time from the race page
          const raceDateTime = await extractRaceDateFromUrl(link);
          const raceTime = extractTimeFromDateTime(raceDateTime);
          
          // Scrape horse data from the race link
          const horses = await scrapeRaceCardByUrl(link);
          
          // Merge horses into race object
          const raceWithHorses = {
            raceNumber,
            time: raceTime,
            result,
            link,
            horses,
            horseCount: horses.length
          };
          
          completedRacesWithHorses.push(raceWithHorses);
          console.log(`    ✅ Found ${horses.length} horses at ${raceTime}`);
          totalRaceCount++;
          
        } catch (error) {
          console.log(`    ⚠️  Failed: ${error.message}`);
          // Still add the race, but with empty horses array
          completedRacesWithHorses.push({
            raceNumber,
            time: 'N/A',
            result,
            link,
            horses: [],
            horseCount: 0
          });
        }
      }
      
      // Add this racetrack with all its races and horses
      const trackWithHorses = {
        racetrack,
        tracklinkUrl,
        completedRaces: completedRacesWithHorses
      };
      
      allRacetracksData.push(trackWithHorses);
    }

    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  COMPLETED: Scraped ${totalRaceCount} races        ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    // Log results to text file
    logScrapingResults(allRacetracksData, totalRaceCount);

    return allRacetracksData;

  } catch (error) {
    console.error('❌ Error scraping all races:', error.message);
    throw error;
  }
}

/**
 * Extract winner data from a race results page
 * Gets: horse number, name, jockey, win odds, and time
 * @param {string} raceLink - The race link URL
 * @returns {Promise<Object|null>} Winner data or null if extraction fails
 */
async function extractWinnerFromRaceLink(raceLink) {
  try {
    if (!raceLink) return null;

    // Extract race number from URL (e.g., "race-1-9785639" → "R1")
    const raceNumberMatch = raceLink.match(/race-(\d+)/i);
    const raceNumber = raceNumberMatch ? `R${raceNumberMatch[1]}` : 'N/A';

    // Construct full URL if relative URL provided
    const fullUrl = raceLink.startsWith('http')
      ? raceLink
      : `https://www.sportsbet.com.au${raceLink}`;

    // Use simple axios fetch - results page data is in HTML
    const response = await axios.get(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);

    // ========== EXTRACT RACE TIME ==========
    const headerCell = $('div[data-automation-id="results-header"] .headerCell_f1lkzql5 span').eq(1);
    const headerText = headerCell.text().trim(); // "31 Oct 11:00"
    let raceTime = extractTimeFromDateTime(headerText) || 'N/A';
    
    // Adjust time by -3 hours (timezone offset)
    if (raceTime !== 'N/A') {
      const [hours, minutes] = raceTime.split(':');
      const adjustedHours = (parseInt(hours) - 3 + 24) % 24; // Subtract 3, handle negative with +24 and %24
      raceTime = `${adjustedHours.toString().padStart(2, '0')}:${minutes}`;
    }

    // ========== EXTRACT WINNER (FIRST RESULT) ==========
    // Find the first result container (winner should be first with "1st" ordinal)
    const resultRows = $('div[data-automation-id="results-row"]');
    console.log(resultRows);
    if (resultRows.length === 0) {
      console.warn(`⚠️ No results found in ${fullUrl}`);
      return null;
    }

    // Get the first result (winner)
    const firstResult = resultRows.first();

    // ========== HORSE NUMBER AND NAME ==========
    // Located in: div[data-automation-id="racecard-outcome-name"] > span:first
    const nameSpan = firstResult.find('div[data-automation-id="racecard-outcome-name"] > span').first();
    const horseInfoText = nameSpan.text().trim(); // "6. Harmony"
    
    let horseNumber = '';
    let horseName = '';
    
    const horseMatch = horseInfoText.match(/^(\d+)\.\s+(.+)$/);
    if (!horseMatch) {
      console.warn(`⚠️ Could not parse horse info from ${fullUrl}: "${horseInfoText}"`);
      return null;
    }
    
    horseNumber = parseInt(horseMatch[1]);
    horseName = horseMatch[2].trim();

    // ========== JOCKEY NAME ==========
    // Located in: span[data-automation-id="racecard-outcome-info-jockey"]
    const jockeySpan = firstResult.find('span[data-automation-id="racecard-outcome-info-jockey"]');
    let jockey = 'N/A';
    
    if (jockeySpan.length > 0) {
      const jockeyText = jockeySpan.text().trim(); // "J: Harry Coffey"
      const jockeyMatch = jockeyText.match(/^J:\s*(.+)$/);
      if (jockeyMatch) {
        jockey = jockeyMatch[1].trim();
      }
    }

    // ========== WIN ODDS ==========
    // Located in: div.prices_fthinbh > div.priceLeft_fdvuytt > span:last
    const priceContainer = firstResult.find('div[class*="prices_"]');
    const priceLeftDiv = priceContainer.find('div[class*="priceLeft_"]');
    const priceSpans = priceLeftDiv.find('> span');
    
    let winOdds = 0;
    if (priceSpans.length >= 2) {
      const oddsText = priceSpans.eq(1).text().trim(); // "10.00"
      winOdds = parseFloat(oddsText) || 0;
    }

    // ========== EXTRACT ALL HORSES' WIN ODDS ==========
    // Get all result rows to find ranking of winner's odds
    const allHorsesOdds = [];
    resultRows.each((idx, elem) => {
      const $row = $(elem);
      const $priceContainer = $row.find('div[class*="prices_"]');
      const $priceLeftDiv = $priceContainer.find('div[class*="priceLeft_"]');
      const $priceSpans = $priceLeftDiv.find('> span');
      
      if ($priceSpans.length >= 2) {
        const odds = parseFloat($priceSpans.eq(1).text().trim());
        if (!isNaN(odds) && odds > 0) {
          allHorsesOdds.push(odds);
        }
      }
    });

    // ========== CALCULATE ODDS RANKING ==========
    let oddsRank = null;
    if (winOdds > 0 && allHorsesOdds.length > 0) {
      // Sort odds in ascending order (lower odds = favorite)
      const sortedOdds = [...allHorsesOdds].sort((a, b) => a - b);
      // Find position (1-based index)
      const position = sortedOdds.findIndex(o => Math.abs(o - winOdds) < 0.01);
      if (position !== -1) {
        oddsRank = position + 1;
      }
    }

    return {
      race: raceNumber,
      time: raceTime,
      winner: {
        number: horseNumber,
        name: horseName,
        jockey: jockey,
        winOdds: winOdds,
        oddsRank: oddsRank
      }
    };

  } catch (error) {
    console.error(`❌ Error extracting winner from ${fullUrl}:`, error.message);
    return null;
  }
}

/**
 * Scrape all winners from today's completed races
 * Returns array of {time, winner{number, name, jockey, winOdds}} sorted by time
 * @returns {Promise<Array>} Array of today's race winners
 */
async function scrapeAllWinners() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  SCRAPING ALL WINNERS                 ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Step 1: Get all completed races
    console.log('📍 Step 1: Fetching completed races...');
    const completedRacesData = await scrapeCompletedRaces();
    
    console.log(`✅ Found ${completedRacesData.length} racetracks\n`);

    // Step 2: Extract winner from each race
    console.log('📍 Step 2: Extracting winners from each race...\n');
    
    const winners = [];
    let processedCount = 0;

    for (const trackData of completedRacesData) {
      const { racetrack, completedRaces } = trackData;
      
      console.log(`\n🏇 Processing ${racetrack}:`);
      
      for (let i = 0; i < completedRaces.length; i++) {
        const race = completedRaces[i];
        const { raceNumber, link } = race;
        
        if (!link) {
          console.log(`  [${i + 1}/${completedRaces.length}] ${raceNumber}: ⏭️  Skipped (no link)`);
          continue;
        }

        try {
          const winnerData = await extractWinnerFromRaceLink(link);
          
          if (winnerData) {
            const winnerEntry = {
              racecourse: racetrack,
              raceNumber,
              link,
              ...winnerData
            };
            winners.push(winnerEntry);
            console.log(`  [${i + 1}/${completedRaces.length}] ${raceNumber} at ${winnerData.time}: ✅ ${winnerData.winner.number}. ${winnerData.winner.name} (${winnerData.winner.jockey})`);
            processedCount++;
          } else {
            console.log(`  [${i + 1}/${completedRaces.length}] ${raceNumber}: ⚠️  No winner found`);
          }
        } catch (error) {
          console.log(`  [${i + 1}/${completedRaces.length}] ${raceNumber}: ❌ ${error.message}`);
        }
      }
    }

    // Step 3: Sort by time
    winners.sort((a, b) => {
      const timeA = a.time.split(':').join('');
      const timeB = b.time.split(':').join('');
      return timeA.localeCompare(timeB);
    });

    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  COMPLETED: Extracted ${processedCount} winners       ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    return winners;

  } catch (error) {
    console.error('❌ Error scraping all winners:', error.message);
    throw error;
  }
}

/**
 * Save race data to database
 * @param {object} db - Database instance
 * @param {object} raceData - Race data with horses
//  */
// async function saveRaceToDB(db, raceData) {
//   try {
//     // Create race entry
//     const newRace = {
//       id: Math.max(...(db.data.races || []).map(r => r.id), 0) + 1,
//       name: raceData.raceName,
//       track: raceData.trackName,
//       date: new Date().toISOString().split('T')[0],
//       url: raceData.raceUrl,
//       scrapedAt: raceData.scrapedAt
//     };

//     if (!db.data.races) db.data.races = [];
//     db.data.races.push(newRace);

//     // Create horse entries linked to this race
//     if (!db.data.horses) db.data.horses = [];
    
//     raceData.horses.forEach(horse => {
//       const newHorse = {
//         id: Math.max(...db.data.horses.map(h => h.id), 0) + 1,
//         number: horse.horseNumber,
//         name: horse.horseName,
//         rank: horse.rank,
//         odds: horse.odds,
//         raceId: newRace.id
//       };
//       db.data.horses.push(newHorse);
//     });

//     await db.write();
//     console.log(`  💾 Saved to database`);
//   } catch (error) {
//     console.error(`  ❌ DB save error: ${error.message}`);
//   }
// }

/**
 * Format results for JSON output
 * @param {Array} results
 * @returns {object}
 */
function formatAsJSON(results) {
  return {
    timestamp: new Date().toISOString(),
    source: 'Sportsbet Australia',
    racetracks: results
  };
}

// Test race card scraper with example URL or provided URL
async function testRaceCardScraper(providedUrl = null) {
  try {
    const exampleUrl = providedUrl || 'https://www.sportsbet.com.au/horse-racing/australia-nz/matamata/race-1-9733540';
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  🐴 Testing Race Card Scraper         ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log('Step 1: Scraping race card with console output verification...\n');
    const horses = await scrapeRaceCardByUrl(exampleUrl);
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('Step 2: JSON Output\n');
    const jsonOutput = formatRaceCardAsJSON(horses, exampleUrl);
    console.log(JSON.stringify(jsonOutput, null, 2));
    
    console.log('\n═══════════════════════════════════════════════');
    console.log(`\n✅ Test completed successfully!\n`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Main execution for testing
async function main() {
  try {
    console.log('\n=== Starting Race Results Scraper ===\n');
    
    const results = await scrapeCompletedRaces();
    
    // Log results to file
    logCompletedRaces(results);
    
    console.log('\n--- Console Output ---');
    console.log(`Found ${results.length} Australian racetracks with completed races:\n`);
    
    results.forEach((track) => {
      console.log(`📍 ${track.racetrack}`);
      console.log(`   Link: ${track.tracklinkUrl}`);
      console.log(`   Completed Races:`);
      track.completedRaces.forEach((race) => {
        console.log(`     ${race.raceNumber}: ${race.result} ${race.link ? `(${race.link})` : ''}`);
      });
      console.log();
    });

    console.log('\n--- JSON Output ---');
    const jsonOutput = formatAsJSON(results);
    console.log(JSON.stringify(jsonOutput, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if executed directly
/**
 * Scrape upcoming races from racing schedule page (today/tomorrow/specific date)
 * @param {string} scheduleUrl - The schedule URL (e.g., 'tomorrow', '2025-10-25', or full URL)
 * @returns {Promise<Array>} Array of racetrack data with upcoming races (Australia only)
 */
async function scrapeUpcomingRaces(scheduleUrl = 'today') {
  try {
    // Build full URL if relative path provided
    const fullUrl = scheduleUrl.startsWith('http')
      ? scheduleUrl
      : `https://www.sportsbet.com.au/racing-schedule/${scheduleUrl}`;

    console.log(`\n📅 Fetching upcoming races from: ${fullUrl}\n`);

    // Fetch HTML content
    const html = await fetchHTML(fullUrl);
    
    ensureLogsDir();
    const debugLogPath = path.join(LOGS_DIR, `debug-upcoming-${scheduleUrl}.html`);
    fs.writeFileSync(debugLogPath, html);
    console.log(`📝 HTML saved to: ${debugLogPath}`);

    const $ = cheerio.load(html);
    
    // List of known New Zealand racetracks to exclude
    const nzTracks = [
      'matamata', 'ellerslie', 'trentham', 'riccarton', 'hastings',
      'awapuni', 'avondale', 'te-rapa', 'ruakaka', 'pukekohe',
      'rotorua', 'wanganui', 'new-plymouth', 'ashburton', 'winton',
      'gore', 'timaru', 'oamaru', 'cromwell', 'otaki'
    ];

    // Find all Australian race links (with or without Fixed Odds icon)
    const raceLinks = $('a[href*="/horse-racing/"]').filter(function() {
      const href = $(this).attr('href');

      // ONLY include Australia races (must be in /australia-nz/ path)
      const isAustraliaRegion = href.includes('/australia-nz/');

      // Exclude New Zealand tracks by checking track name in URL
      const urlLower = href.toLowerCase();
      const isNotNZTrack = !nzTracks.some(track => urlLower.includes(`/${track}/`));

      // Must have: race link, Australia region, NOT NZ track (icon check removed)
      return href && href.includes('/race-') && isAustraliaRegion && isNotNZTrack;
    });

    if (raceLinks.length === 0) {
      console.warn('⚠️ No Australian race links with Fixed Odds found on page');
      const allLinks = $('a[href*="/horse-racing/"]');
      console.warn(`Total horse-racing links found: ${allLinks.length}`);
      allLinks.each((i, link) => {
        if (i < 5) console.warn(`  Sample link ${i}: ${$(link).attr('href')}`);
      });
      return [];
    }

    console.log(`✅ Found ${raceLinks.length} Australian races with Fixed Odds\n`);

    // Group races by racetrack
    const racetrackMap = new Map();
    console.log($(raceLinks[0]).html());
    
    raceLinks.each((index, link) => {
      const $link = $(link);
      const raceUrl = $link.attr('href') || '';

      // Extract racetrack name from URL
      // URL format: /horse-racing/australia-nz/moonee-valley/race-6-9759417
      // Safer approach: extract from the part BEFORE /race-
      const beforeRace = raceUrl.split('/race-')[0];
      const urlParts = beforeRace.split('/').filter(part => part.length > 0);
      const racetrackSlug = urlParts.length > 0 ? urlParts[urlParts.length - 1] : '';
      const racetrackName = racetrackSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      if (!racetrackName) {
        return; // Skip if no valid racetrack name
      }

      // Extract race number - try multiple methods
      const raceTitle = $link.attr('title') || '';
      let raceNumber = '';
      
      // Method 1: Try to extract from title attribute (e.g., "R1 at Flemington")
      const titleMatch = raceTitle.match(/^R(\d+)/);
      if (titleMatch) {
        raceNumber = `R${titleMatch[1]}`;
      } else {
        // Method 2: Extract from URL (e.g., /race-7-9759417 → R7)
        const urlRaceMatch = raceUrl.match(/race-(\d+)/);
        if (urlRaceMatch) {
          raceNumber = `R${urlRaceMatch[1]}`;
        } else {
          // Method 3: If extraction fails, mark as unknown (don't use index-based fallback)
          console.warn(`⚠️ Could not extract race number from URL: ${raceUrl}`);
          raceNumber = 'N/A';
        }
      }

      // Extract race TIME (HH:MM format)
      // Look for any span containing time pattern (e.g., "11:00", "3:45")
      let raceTime = 'TBD'; // Default for upcoming races

      // Search through all spans in the link to find time pattern
      $link.find('span').each((_, span) => {
        const text = $(span).text().trim();

        // Match time patterns like "11:00", "3:45", "12:30"
        // Also match patterns with AM/PM or other text
        const timeMatch = text.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          raceTime = timeMatch[1];
          return false; // Break the loop once time is found
        }
      });

      // Group by racetrack
      if (!racetrackMap.has(racetrackName)) {
        racetrackMap.set(racetrackName, {
          racetrack: racetrackName,
          tracklinkUrl: raceUrl.split('/race-')[0] || '',
          completedRaces: []
        });
      }

      racetrackMap.get(racetrackName).completedRaces.push({
        raceNumber,
        time: raceTime,
        result: '',
        link: raceUrl,
        horses: [],
        horseCount: 0
      });
    });

    const allRacetracksData = Array.from(racetrackMap.values());

    // Log results
    allRacetracksData.forEach(track => {
      console.log(`🏇 ${track.racetrack}: ${track.completedRaces.length} races`);
    });

    console.log(`\n📊 Total Australian racetracks: ${allRacetracksData.length}`);
    console.log(`📊 Total upcoming races: ${allRacetracksData.reduce((sum, track) => sum + track.completedRaces.length, 0)}\n`);

    return allRacetracksData;
  } catch (error) {
    console.error('❌ Error scraping upcoming races:', error.message);
    ensureLogsDir();
    const errorLogPath = path.join(LOGS_DIR, `error-upcoming-${scheduleUrl}.txt`);
    fs.writeFileSync(errorLogPath, `Error: ${error.message}\n\nStack:\n${error.stack}`);
    console.error(`📝 Error saved to: ${errorLogPath}`);
    return [];
  }
}

/**
 * Scrape upcoming races with full horse data (similar to scrapeAllCompletedRacesWithCards)
 * @param {string} scheduleUrl - Schedule URL parameter ('today', 'tomorrow', or '2025-10-25')
 * @returns {Promise<Array>} Array of racetrack data with upcoming races and horses
 */
async function scrapeAllUpcomingRacesWithCards(scheduleUrl = 'today') {
  try {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  SCRAPING UPCOMING RACES WITH HORSES  ║`);
    console.log(`║  Date: ${scheduleUrl.padEnd(30)} ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    // Step 1: Get all upcoming races (racetracks and race links)
    const racetracks = await scrapeUpcomingRaces(scheduleUrl);
    console.log(racetracks);
    if (racetracks.length === 0) {
      console.log('⚠️  No upcoming races found');
      return [];
    }

    const allRacetracksData = [];
    let totalRaceCount = 0;

    // Step 2: For each racetrack, scrape horse data for each race
    for (const trackData of racetracks) {
      const { racetrack, tracklinkUrl, completedRaces } = trackData;

      console.log(`\n🏇 ${racetrack.toUpperCase()}`);
      console.log(`${'─'.repeat(50)}`);

      const upcomingRacesWithHorses = [];

      for (const race of completedRaces) {
        const { raceNumber, time, link } = race; // Extract time from race object
        totalRaceCount++;

        console.log(`\n  📍 ${raceNumber} - ${time} - ${link}`);

        try {
          // Scrape horse data for this race
          const horses = await scrapeRaceCardByUrl(link);

          if (horses && horses.length > 0) {
            console.log(`     ✅ Found ${horses.length} horses`);

            // Use the time from scrapeUpcomingRaces (usually 'TBD' for upcoming races)
            upcomingRacesWithHorses.push({
              raceNumber,
              time: time || 'TBD', // Use time from schedule page (defaults to TBD)
              result: '', // No result for upcoming races
              link,
              horses,
              horseCount: horses.length
            });
          } else {
            console.log(`     ⚠️  No horses found`);

            // Still add the race, but with empty horses array
            upcomingRacesWithHorses.push({
              raceNumber,
              time: time || 'TBD', // Use time from schedule page (defaults to TBD)
              result: '',
              link,
              horses: [],
              horseCount: 0
            });
          }

          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`     ❌ Error scraping race: ${error.message}`);

          // Still add the race, but with empty horses array
          upcomingRacesWithHorses.push({
            raceNumber,
            time: time || 'TBD', // Use time from schedule page (defaults to TBD)
            result: '',
            link,
            horses: [],
            horseCount: 0
          });
        }
      }

      // Add this racetrack with all its races and horses
      const trackWithHorses = {
        racetrack,
        tracklinkUrl,
        completedRaces: upcomingRacesWithHorses
      };

      allRacetracksData.push(trackWithHorses);
    }

    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  COMPLETED: Scraped ${totalRaceCount} races        ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    return allRacetracksData;

  } catch (error) {
    console.error('❌ Error scraping upcoming races with horses:', error.message);
    throw error;
  }
}

// Export all functions for CommonJS
module.exports = {
  logCompletedRaces,
  scrapeCompletedRaces,
  scrapeRaceCardByUrl,
  extractRaceDateFromUrl,
  formatRaceCardAsJSON,
  scrapeAllCompletedRacesWithCards,
  extractWinnerFromRaceLink,
  scrapeAllWinners,
  formatAsJSON,
  scrapeUpcomingRaces,
  scrapeAllUpcomingRacesWithCards
};