const { db } = require('../config/db');

exports.createPostureLog = (req, res) => {
  const userId = req.user.id;
  const { status, duration_seconds } = req.body;

  const allowedStatus = ['normal', 'warning', 'danger'];

  if (!allowedStatus.includes(status)) {
    return res.status(400).json({
      message: 'status는 normal, warning, danger 중 하나여야 합니다.',
    });
  }

  if (
    duration_seconds === undefined ||
    duration_seconds === null ||
    Number.isNaN(Number(duration_seconds)) ||
    Number(duration_seconds) < 0
  ) {
    return res.status(400).json({
      message: 'duration_seconds는 0 이상의 숫자여야 합니다.',
    });
  }

  db.run(
    `INSERT INTO PostureLogs (user_id, status, duration_seconds)
     VALUES (?, ?, ?)`,
    [userId, status, Number(duration_seconds)],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: '자세 로그 저장 실패',
          error: err.message,
        });
      }

      return res.status(201).json({
        message: '자세 로그 저장 성공',
        logId: this.lastID,
      });
    }
  );
};