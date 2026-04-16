// SQLite database setup and schema initialization

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite connection failed:', err.message);
  } else {
    console.log('SQLite connected');
  }
});

db.configure('busyTimeout', 5000);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
}

async function ensureColumn(tableName, columnName, definition, backfillSql) {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  const hasColumn = columns.some((column) => column.name === columnName);

  if (hasColumn) {
    return false;
  }

  await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);

  if (backfillSql) {
    await run(backfillSql);
  }

  return true;
}

async function initDatabase() {
  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      nickname TEXT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      profile_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS LandMark (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      nose_x REAL,
      nose_y REAL,
      nose_z REAL,
      nose_visibility REAL,
      left_ear_x REAL,
      left_ear_y REAL,
      left_ear_z REAL,
      left_ear_visibility REAL,
      right_ear_x REAL,
      right_ear_y REAL,
      right_ear_z REAL,
      right_ear_visibility REAL,
      left_shoulder_x REAL,
      left_shoulder_y REAL,
      left_shoulder_z REAL,
      left_shoulder_visibility REAL,
      right_shoulder_x REAL,
      right_shoulder_y REAL,
      right_shoulder_z REAL,
      right_shoulder_visibility REAL,
      shoulder_center_x REAL,
      shoulder_center_y REAL,
      shoulder_center_z REAL,
      ear_center_x REAL,
      ear_center_y REAL,
      ear_center_z REAL,
      forward_distance REAL,
      nose_shoulder_distance REAL,
      head_angle REAL,
      shoulder_width REAL,
      min_visibility REAL,
      avg_visibility REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS Notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

  await run(`
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

  await run(`
    CREATE TABLE IF NOT EXISTS PostureLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('normal', 'warning', 'danger')),
      duration_seconds INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

  await ensureColumn('Users', 'nickname', 'TEXT');
  await ensureColumn('Users', 'profile_image', 'TEXT');
  await ensureColumn(
    'Users',
    'updated_at',
    'DATETIME',
    `UPDATE Users
     SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)`
  );

  await ensureColumn('LandMark', 'nose_z', 'REAL');
  await ensureColumn('LandMark', 'nose_visibility', 'REAL');
  await ensureColumn('LandMark', 'left_ear_z', 'REAL');
  await ensureColumn('LandMark', 'left_ear_visibility', 'REAL');
  await ensureColumn('LandMark', 'right_ear_z', 'REAL');
  await ensureColumn('LandMark', 'right_ear_visibility', 'REAL');
  await ensureColumn('LandMark', 'left_shoulder_z', 'REAL');
  await ensureColumn('LandMark', 'left_shoulder_visibility', 'REAL');
  await ensureColumn('LandMark', 'right_shoulder_z', 'REAL');
  await ensureColumn('LandMark', 'right_shoulder_visibility', 'REAL');
  await ensureColumn('LandMark', 'shoulder_center_x', 'REAL');
  await ensureColumn('LandMark', 'shoulder_center_y', 'REAL');
  await ensureColumn('LandMark', 'shoulder_center_z', 'REAL');
  await ensureColumn('LandMark', 'ear_center_x', 'REAL');
  await ensureColumn('LandMark', 'ear_center_y', 'REAL');
  await ensureColumn('LandMark', 'ear_center_z', 'REAL');
  await ensureColumn('LandMark', 'forward_distance', 'REAL');
  await ensureColumn('LandMark', 'nose_shoulder_distance', 'REAL');
  await ensureColumn('LandMark', 'head_angle', 'REAL');
  await ensureColumn('LandMark', 'shoulder_width', 'REAL');
  await ensureColumn('LandMark', 'min_visibility', 'REAL');
  await ensureColumn('LandMark', 'avg_visibility', 'REAL');
  await ensureColumn(
    'LandMark',
    'updated_at',
    'DATETIME',
    `UPDATE LandMark
     SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)`
  );

  await ensureColumn(
    'UserDevices',
    'updated_at',
    'DATETIME',
    `UPDATE UserDevices
     SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)`
  );

  await ensureColumn('PostureLogs', 'status', 'TEXT');
  await ensureColumn('PostureLogs', 'duration_seconds', 'INTEGER');
  await ensureColumn('PostureLogs', 'created_at', 'DATETIME');
  await ensureColumn(
    'PostureLogs',
    'updated_at',
    'DATETIME',
    `UPDATE PostureLogs
     SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)`
  );

  await run(`
    CREATE INDEX IF NOT EXISTS idx_landmark_user_created_at
    ON LandMark (user_id, created_at DESC)
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS idx_posture_logs_user_created_at
    ON PostureLogs (user_id, created_at DESC)
  `);
}

module.exports = {
  db,
  initDatabase,
};
