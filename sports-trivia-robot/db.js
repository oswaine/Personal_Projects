const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');  // In-memory database

// Create a table to store user trivia history
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS user_trivia (user_id TEXT, last_answered TEXT)");
});

module.exports = db;
