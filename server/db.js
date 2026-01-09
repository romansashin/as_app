import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// Database path from environment variable or default
const dbPath = process.env.DATABASE_PATH || './database.sqlite';
const db = new sqlite3.Database(dbPath);

// Promisify database methods
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Initialize database tables
export const initDB = async () => {
  // Create users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, provider_id)
    )
  `);

  // Create user_progress table
  // Note: No UNIQUE constraint - we want to track multiple listening sessions
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      practice_id TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // Create index for faster queries
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_user_progress_user_practice 
    ON user_progress(user_id, practice_id)
  `);
};

// User operations
export const findUserByProviderId = async (provider, providerId) => {
  return await dbGet(
    'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
    [provider, providerId]
  );
};

export const createUser = async (provider, providerId, email) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (provider, provider_id, email) VALUES (?, ?, ?)',
      [provider, providerId, email],
      function(err) {
        if (err) {
          reject(err);
        } else {
          dbGet('SELECT * FROM users WHERE id = ?', [this.lastID])
            .then(resolve)
            .catch(reject);
        }
      }
    );
  });
};

export const getUserById = async (userId) => {
  return await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
};

// Progress operations
export const getUserProgress = async (userId) => {
  const rows = await dbAll(
    `SELECT practice_id, COUNT(*) as count 
     FROM user_progress 
     WHERE user_id = ? 
     GROUP BY practice_id`,
    [userId]
  );
  
  // Convert to object format: { "p1": 5, "p2": 3 }
  const progress = {};
  rows.forEach(row => {
    progress[row.practice_id] = parseInt(row.count, 10);
  });
  
  return progress;
};

export const addUserProgress = async (userId, practiceId) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO user_progress (user_id, practice_id) VALUES (?, ?)',
      [userId, practiceId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      }
    );
  });
};

export { db, dbRun, dbGet, dbAll };

