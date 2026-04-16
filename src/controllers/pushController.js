const { db } = require('../config/db');
const admin = require('../config/firebaseAdmin');

exports.sendPushToUser = async (req, res) => {
  const requesterUserId = Number(req.user.id);
  const targetUserId = Number(req.body.user_id);
  const { title, body } = req.body;

  if (!targetUserId || !title || !body) {
    return res.status(400).json({
      message: 'user_id, title, and body are required.',
    });
  }

  if (targetUserId !== requesterUserId) {
    return res.status(403).json({
      message: 'You can only send push notifications to your own devices.',
    });
  }

  db.all(
    'SELECT fcm_token FROM UserDevices WHERE user_id = ?',
    [targetUserId],
    async (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: 'Failed to fetch FCM tokens.',
          error: err.message,
        });
      }

      if (!rows || rows.length === 0) {
        return res.status(404).json({
          message: 'No registered device tokens were found for this user.',
        });
      }

      if (!admin.isFirebaseConfigured()) {
        return res.status(503).json({
          message: 'Push notifications are not configured on this server.',
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
          message: 'Push notification sent successfully.',
          successCount: response.successCount,
          failureCount: response.failureCount,
        });
      } catch (error) {
        return res.status(500).json({
          message: 'Failed to send push notification.',
          error: error.message,
        });
      }
    }
  );
};
