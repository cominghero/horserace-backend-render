const fs = require('fs');
const path = require('path');

// Database file path
const dbFile = process.env.DB_PATH || path.join(__dirname, 'db.json');

console.log('Database location:', dbFile);

// Define default data structure
const defaultData = {
  races: [
    { id: 1, name: 'Morning Cup', date: '2024-01-15', track: 'Ascot' },
    { id: 2, name: 'Evening Stakes', date: '2024-01-15', track: 'Newmarket' },
    { id: 3, name: 'Afternoon Classic', date: '2024-01-16', track: 'Royal Ascot' }
  ],
  horses: [
    { id: 1, name: 'Thunder Strike', trainer: 'John Smith', wins: 5, raceId: 1 },
    { id: 2, name: 'Swift Runner', trainer: 'Jane Doe', wins: 8, raceId: 1 },
    { id: 3, name: 'Golden Hooves', trainer: 'Bob Johnson', wins: 3, raceId: 1 },
    { id: 4, name: 'Black Beauty', trainer: 'Sarah Williams', wins: 6, raceId: 2 },
    { id: 5, name: 'Fast Lightning', trainer: 'Mike Brown', wins: 4, raceId: 2 }
  ],
  bets: [
    { id: 'bet1', horseId: 1, amount: 100, raceId: 1, timestamp: '2024-01-15T10:30:00Z', status: 'pending' },
    { id: 'bet2', horseId: 2, amount: 50, raceId: 1, timestamp: '2024-01-15T11:00:00Z', status: 'won' }
  ]
};

// Simple database object
const db = {
  data: defaultData,
  write: function() {
    try {
      fs.writeFileSync(dbFile, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing database:', err);
    }
  },
  read: function() {
    try {
      if (fs.existsSync(dbFile)) {
        const content = fs.readFileSync(dbFile, 'utf-8');
        this.data = JSON.parse(content);
      } else {
        this.write();
      }
    } catch (err) {
      console.error('Error reading database:', err);
      this.data = defaultData;
    }
  }
};

// Initialize database
db.read();

module.exports = db;