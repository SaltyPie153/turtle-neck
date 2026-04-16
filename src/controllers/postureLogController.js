const { db } = require('../config/db');

const ALLOWED_STATUS = ['normal', 'warning', 'danger'];

function normalizeDurationSeconds(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue);
}

function normalizeRecordedAt(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

exports.createPostureLog = (req, res) => {
  const userId = req.user.id;
  const { status, duration_seconds, recorded_at } = req.body;

  if (!ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({
      message: 'status must be one of normal, warning, or danger.',
    });
  }

  const normalizedDurationSeconds = normalizeDurationSeconds(duration_seconds);

  if (normalizedDurationSeconds === null) {
    return res.status(400).json({
      message: 'duration_seconds must be a number greater than or equal to 0.',
    });
  }

  const normalizedRecordedAt = normalizeRecordedAt(recorded_at);

  if (recorded_at !== undefined && normalizedRecordedAt === null) {
    return res.status(400).json({
      message: 'recorded_at must be a valid datetime string.',
    });
  }

  const insertSql = normalizedRecordedAt
    ? `INSERT INTO PostureLogs (user_id, status, duration_seconds, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    : `INSERT INTO PostureLogs (user_id, status, duration_seconds)
       VALUES (?, ?, ?)`;

  const insertValues = normalizedRecordedAt
    ? [userId, status, normalizedDurationSeconds, normalizedRecordedAt, normalizedRecordedAt]
    : [userId, status, normalizedDurationSeconds];

  db.run(insertSql, insertValues, function onInsert(err) {
    if (err) {
      return res.status(500).json({
        message: 'Failed to save posture log.',
        error: err.message,
      });
    }

    return db.get(
      `SELECT id, user_id, status, duration_seconds, created_at, updated_at
       FROM PostureLogs
       WHERE id = ?`,
      [this.lastID],
      (selectErr, row) => {
        if (selectErr) {
          return res.status(500).json({
            message: 'Posture log was saved, but failed to fetch the saved record.',
            error: selectErr.message,
          });
        }

        return res.status(201).json({
          message: 'Posture log saved successfully.',
          data: row,
        });
      }
    );
  });
};
