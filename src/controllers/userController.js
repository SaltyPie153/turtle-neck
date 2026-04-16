const bcrypt = require('bcrypt');
const { db } = require('../config/db');

exports.updateMyProfile = async (req, res) => {
  const userId = req.user.id;
  const { password, nickname, profile_image } = req.body;

  const fields = [];
  const values = [];

  try {
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          message: '비밀번호는 6자 이상이어야 합니다.',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push('password = ?');
      values.push(hashedPassword);
    }

    if (nickname !== undefined) {
      fields.push('nickname = ?');
      values.push(nickname);
    }

    if (profile_image !== undefined) {
      fields.push('profile_image = ?');
      values.push(profile_image);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        message: '수정할 정보가 없습니다.',
      });
    }

    values.push(userId);

    db.run(
      `UPDATE Users SET ${fields.join(', ')} WHERE id = ?`,
      values,
      function (err) {
        if (err) {
          return res.status(500).json({
            message: '회원정보 수정 실패',
            error: err.message,
          });
        }

        return res.status(200).json({
          message: '회원정보 수정 성공',
        });
      }
    );
  } catch (error) {
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

exports.getMyProfile = (req, res) => {
  const userId = req.user.id;

  db.get(
    `SELECT id, username, email, nickname, profile_image, created_at
     FROM Users
     WHERE id = ?`,
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: '회원정보 조회 실패',
          error: err.message,
        });
      }

      if (!row) {
        return res.status(404).json({
          message: '사용자를 찾을 수 없습니다.',
        });
      }

      return res.status(200).json({
        message: '회원정보 조회 성공',
        data: row,
      });
    }
  );
};