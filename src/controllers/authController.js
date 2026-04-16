// 사용자 인증 관련 컨트롤러

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_key';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.register = async (req, res) => {
  try {
    const { username, email, password, nickname } = req.body;

    const profileImage = req.file
      ? `/uploads/profiles/${req.file.filename}`
      : null;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'username, email, password는 필수입니다.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: '비밀번호는 6자 이상이어야 합니다.',
      });
    }

    db.get('SELECT id FROM Users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({
          message: '사용자 조회 중 오류가 발생했습니다.',
          error: err.message,
        });
      }

      if (row) {
        return res.status(409).json({
          message: '이미 사용 중인 이메일입니다.',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
        `INSERT INTO Users (username, email, password, nickname, profile_image)
         VALUES (?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, nickname || null, profileImage],
        function (insertErr) {
          if (insertErr) {
            console.error('회원가입 insert 오류:', insertErr.message);
            return res.status(500).json({
              message: '회원가입 중 오류가 발생했습니다.',
              error: insertErr.message,
            });
          }

          const user = {
            id: this.lastID,
            username,
            email,
            nickname: nickname || null,
            profile_image: profileImage,
          };

          const token = generateToken(user);

          return res.status(201).json({
            message: '회원가입 성공',
            user,
            token,
          });
        }
      );
    });
  } catch (error) {
    console.error('회원가입 서버 오류:', error.message);
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  }
};


// 로그인 및 사용자 정보 조회 기능을 구현한 컨트롤러
exports.login = (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'email, password는 필수입니다.',
      });
    }

    db.get('SELECT * FROM Users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({
          message: '로그인 중 오류가 발생했습니다.',
          error: err.message,
        });
      }

      if (!user) {
        return res.status(401).json({
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        });
      }

      const token = generateToken(user);

      return res.status(200).json({
        message: '로그인 성공',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        token,
      });
    });
  } catch (error) {
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

exports.me = (req, res) => {
  return res.status(200).json({
    message: '인증 성공',
    user: req.user,
  });
};