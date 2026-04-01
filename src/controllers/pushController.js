const { db } = require('../config/db');
const admin = require('../config/firebaseAdmin');

exports.sendPushToUser = async (req, res) => {
  const { user_id, title, body } = req.body;

  if (!user_id || !title || !body) {
    return res.status(400).json({
      message: 'user_id, title, body는 필수입니다.',
    });
  }

  db.all(
    'SELECT fcm_token FROM UserDevices WHERE user_id = ?',
    [user_id],
    async (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: 'FCM 토큰 조회 실패',
          error: err.message,
        });
      }

      if (!rows || rows.length === 0) {
        return res.status(404).json({
          message: '등록된 기기 토큰이 없습니다.',
        });
      }

      const tokens = rows.map((row) => row.fcm_token);

      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title,
            body,
          },
        });

        return res.status(200).json({
          message: '푸시 알림 전송 성공',
          successCount: response.successCount,
          failureCount: response.failureCount,
        });
      } catch (error) {
        return res.status(500).json({
          message: '푸시 알림 전송 실패',
          error: error.message,
        });
      }
    }
  );
};