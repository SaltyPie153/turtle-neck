//SQLite 데이터베이스 설정 및 초기화

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite 연결 실패:', err.message);
  } else {
    console.log('SQLite 연결 성공');
  }
});

db.configure('busyTimeout', 5000);

function initDatabase() {
  db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS LandMark (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,

      nose_x REAL,
      nose_y REAL,

      left_ear_x REAL,
      left_ear_y REAL,
      right_ear_x REAL,
      right_ear_y REAL,

      left_shoulder_x REAL,
      left_shoulder_y REAL,
      right_shoulder_x REAL,
      right_shoulder_y REAL,

      shoulder_center_x REAL,
      shoulder_center_y REAL,

      ear_center_x REAL,
      ear_center_y REAL,

      forward_distance REAL,
      nose_shoulder_distance REAL,
      head_angle REAL,
      shoulder_width REAL,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS Notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS UserDevices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      device_type TEXT NOT NULL CHECK (device_type IN ('web', 'android', 'ios')),
      fcm_token TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);
});
}


module.exports = {
  db,
  initDatabase,
};