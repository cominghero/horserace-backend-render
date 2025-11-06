const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const { scrapeCompletedRaces, formatAsJSON, scrapeRaceCardByUrl, formatRaceCardAsJSON, scrapeAllCompletedRacesWithCards, logCompletedRaces, scrapeAllUpcomingRacesWithCards, scrapeAllWinners } = require('./scraper');
const scraperQueue = require('./scraper-queue');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Allow configurable CORS
  credentials: true
}));
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// Scraper endpoint - Get completed race results from Sportsbet
app.get('/api/scrape/completed-races', async (req, res) => {
  try {
    const results = await scrapeCompletedRaces();
    
    // Log results to file
    logCompletedRaces(results);
    
    const jsonOutput = formatAsJSON(results);
    res.json(jsonOutput);
  } catch (error) {
    console.error('Scraper error:', error);
    res.status(500).json({ error: 'Failed to scrape racing results', message: error.message });
  }
});

// Scraper endpoint - Get race card data from a specific race URL
app.post('/api/scrape/race-card', async (req, res) => {
  try {
    const { raceUrl } = req.body;
    
    if (!raceUrl) {
      return res.status(400).json({ error: 'Missing required field: raceUrl' });
    }

    const horses = await scrapeRaceCardByUrl(raceUrl);
    const jsonOutput = formatRaceCardAsJSON(horses, raceUrl);
    res.json(jsonOutput);
  } catch (error) {
    console.error('Race card scraper error:', error);
    res.status(500).json({ error: 'Failed to scrape race card', message: error.message });
  }
});

// Scraper endpoint - Scrape all completed races with race cards and save to DB
app.post('/api/scrape/all-races', async (req, res) => {
  try {
    console.log('\n📡 API Request: Scraping all completed races with race cards...\n');

    const allRaceData = await scraperQueue.add(
      async () => scrapeAllCompletedRacesWithCards(db),
      'Scrape all completed races with race cards'
    );

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      source: 'Sportsbet Australia',
      totalRaces: allRaceData.length,
      data: allRaceData
    });
  } catch (error) {
    console.error('Scrape all races error:', error);
    res.status(500).json({ error: 'Failed to scrape all races', message: error.message });
  }
});

// Scraper endpoint - Scrape all upcoming races with race cards
app.post('/api/scrape/upcoming/:date', async (req, res) => {
  try {
    const { date } = req.params; // 'today', 'tomorrow', or '2025-10-25'

    console.log(`\n📡 API Request: Scraping upcoming races for ${date}...\n`);

    const allRaceData = await scraperQueue.add(
      async () => scrapeAllUpcomingRacesWithCards(date),
      `Scrape upcoming races for ${date}`
    );

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      source: 'Sportsbet Australia',
      scheduleDate: date,
      totalRaces: allRaceData.length,
      data: allRaceData
    });
  } catch (error) {
    console.error('Scrape upcoming races error:', error);
    res.status(500).json({ error: 'Failed to scrape upcoming races', message: error.message });
  }
});

// Scraper endpoint - Scrape all winners from today's completed races
app.post('/api/scrape/winners', async (req, res) => {
  try {
    console.log('\n📡 API Request: Scraping winners from today\'s races...\n');

    const winnersData = await scraperQueue.add(
      async () => scrapeAllWinners(),
      'Scrape all winners from today\'s races'
    );

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      source: 'Sportsbet Australia',
      totalWinners: winnersData.length,
      data: winnersData
    });
  } catch (error) {
    console.error('Scrape winners error:', error);
    res.status(500).json({ error: 'Failed to scrape winners', message: error.message });
  }
});

// Routes for races
app.get('/api/races', (req, res) => {
  res.json(db.data.races);
});

app.get('/api/races/:id', (req, res) => {
  const { id } = req.params;
  const race = db.data.races.find(r => r.id === parseInt(id));
  
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }

  const raceWithHorses = {
    ...race,
    horses: db.data.horses.filter(h => h.raceId === parseInt(id))
  };

  res.json(raceWithHorses);
});

app.post('/api/races', (req, res) => {
  const { name, date, track } = req.body;
  
  if (!name || !date || !track) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newRace = {
    id: Math.max(...db.data.races.map(r => r.id), 0) + 1,
    name,
    date,
    track
  };

  db.data.races.push(newRace);
  db.write();
  res.status(201).json(newRace);
});

// Routes for horses
app.get('/api/horses', (req, res) => {
  res.json(db.data.horses);
});

app.get('/api/horses/:id', (req, res) => {
  const { id } = req.params;
  const horse = db.data.horses.find(h => h.id === parseInt(id));
  
  if (!horse) {
    return res.status(404).json({ error: 'Horse not found' });
  }

  res.json(horse);
});

app.post('/api/horses', (req, res) => {
  const { name, trainer, wins, raceId } = req.body;
  
  if (!name || !trainer || wins === undefined || !raceId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newHorse = {
    id: Math.max(...db.data.horses.map(h => h.id), 0) + 1,
    name,
    trainer,
    wins,
    raceId
  };

  db.data.horses.push(newHorse);
  db.write();
  res.status(201).json(newHorse);
});

// Routes for bets
app.post('/api/bets', (req, res) => {
  const { horseId, amount, raceId } = req.body;
  
  if (!horseId || !amount || !raceId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newBet = {
    id: Math.random().toString(36).substr(2, 9),
    horseId,
    amount,
    raceId,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  db.data.bets.push(newBet);
  db.write();
  res.status(201).json(newBet);
});

app.get('/api/bets', (req, res) => {
  res.json(db.data.bets);
});

app.get('/api/bets/:id', (req, res) => {
  const { id } = req.params;
  const bet = db.data.bets.find(b => b.id === id);
  
  if (!bet) {
    return res.status(404).json({ error: 'Bet not found' });
  }

  res.json(bet);
});

app.patch('/api/bets/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const bet = db.data.bets.find(b => b.id === id);
  
  if (!bet) {
    return res.status(404).json({ error: 'Bet not found' });
  }

  if (status) {
    bet.status = status;
    db.write();
  }

  res.json(bet);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});