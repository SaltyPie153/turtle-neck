// LandMark 관련 컨트롤러

const db = require('../config/db');


// LandMark 저장 및 조회 기능을 구현한 컨트롤러
exports.createLandmark = (req, res) => {
  const userId = req.user.id;

  const {
    nose_x,
    nose_y,
    left_ear_x,
    left_ear_y,
    right_ear_x,
    right_ear_y,
    left_shoulder_x,
    left_shoulder_y,
    right_shoulder_x,
    right_shoulder_y,
    shoulder_center_x,
    shoulder_center_y,
    ear_center_x,
    ear_center_y,
    forward_distance,
    nose_shoulder_distance,
    head_angle,
    shoulder_width,
  } = req.body;

  const sql = `
    INSERT INTO LandMark (
      user_id,
      nose_x, nose_y,
      left_ear_x, left_ear_y,
      right_ear_x, right_ear_y,
      left_shoulder_x, left_shoulder_y,
      right_shoulder_x, right_shoulder_y,
      shoulder_center_x, shoulder_center_y,
      ear_center_x, ear_center_y,
      forward_distance,
      nose_shoulder_distance,
      head_angle,
      shoulder_width
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    userId,
    nose_x, nose_y,
    left_ear_x, left_ear_y,
    right_ear_x, right_ear_y,
    left_shoulder_x, left_shoulder_y,
    right_shoulder_x, right_shoulder_y,
    shoulder_center_x, shoulder_center_y,
    ear_center_x, ear_center_y,
    forward_distance,
    nose_shoulder_distance,
    head_angle,
    shoulder_width,
  ];

  db.run(sql, values, function (err) {
    if (err) {
      return res.status(500).json({
        message: 'LandMark 저장 실패',
        error: err.message,
      });
    }

    return res.status(201).json({
      message: 'LandMark 저장 성공',
      landmarkId: this.lastID,
    });
  });
};


// 최신 LandMark 조회 기능을 구현한 컨트롤러
exports.getLatestLandmark = (req, res) => {
  const userId = req.user.id;

  db.get(
    `SELECT * FROM LandMark
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: 'LandMark 조회 실패',
          error: err.message,
        });
      }

      if (!row) {
        return res.status(404).json({
          message: '저장된 기준 자세가 없습니다.',
        });
      }

      return res.status(200).json(row);
    }
  );
};