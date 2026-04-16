const { db } = require('../config/db');

exports.getTodayDashboard = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT
      COALESCE(SUM(duration_seconds), 0) AS total_usage_seconds,
      COALESCE(SUM(CASE WHEN status = 'normal' THEN duration_seconds ELSE 0 END), 0) AS normal_seconds,
      COALESCE(SUM(CASE WHEN status = 'danger' THEN 1 ELSE 0 END), 0) AS danger_count
    FROM PostureLogs
    WHERE user_id = ?
      AND DATE(created_at, 'localtime') = DATE('now', 'localtime')
  `;

  db.get(sql, [userId], (err, row) => {
    if (err) {
      return res.status(500).json({
        message: '금일 대시보드 조회 실패',
        error: err.message,
      });
    }

    const totalUsageSeconds = Number(row.total_usage_seconds || 0);
    const normalSeconds = Number(row.normal_seconds || 0);
    const dangerCount = Number(row.danger_count || 0);

    const goodPostureRate =
      totalUsageSeconds === 0
        ? 0
        : Number(((normalSeconds / totalUsageSeconds) * 100).toFixed(2));

    return res.status(200).json({
      message: '금일 대시보드 조회 성공',
      data: {
        total_usage_seconds: totalUsageSeconds,
        total_usage_minutes: Number((totalUsageSeconds / 60).toFixed(2)),
        danger_count: dangerCount,
        good_posture_rate: goodPostureRate,
      },
    });
  });
};

exports.getWeeklyDashboard = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT
      DATE(created_at, 'localtime') AS log_date,
      COALESCE(SUM(duration_seconds), 0) AS total_usage_seconds,
      COALESCE(SUM(CASE WHEN status = 'normal' THEN duration_seconds ELSE 0 END), 0) AS normal_seconds,
      COALESCE(SUM(CASE WHEN status = 'danger' THEN 1 ELSE 0 END), 0) AS danger_count
    FROM PostureLogs
    WHERE user_id = ?
      AND DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-6 days')
    GROUP BY DATE(created_at, 'localtime')
    ORDER BY log_date ASC
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: '주간 리포트 조회 실패',
        error: err.message,
      });
    }

    const resultMap = new Map();

    rows.forEach((row) => {
      const totalUsageSeconds = Number(row.total_usage_seconds || 0);
      const normalSeconds = Number(row.normal_seconds || 0);

      const goodPostureRate =
        totalUsageSeconds === 0
          ? 0
          : Number(((normalSeconds / totalUsageSeconds) * 100).toFixed(2));

      resultMap.set(row.log_date, {
        date: row.log_date,
        total_usage_seconds: totalUsageSeconds,
        total_usage_minutes: Number((totalUsageSeconds / 60).toFixed(2)),
        danger_count: Number(row.danger_count || 0),
        good_posture_rate: goodPostureRate,
      });
    });

    const weeklyData = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      weeklyData.push(
        resultMap.get(dateKey) || {
          date: dateKey,
          total_usage_seconds: 0,
          total_usage_minutes: 0,
          danger_count: 0,
          good_posture_rate: 0,
        }
      );
    }

    return res.status(200).json({
      message: '주간 리포트 조회 성공',
      data: weeklyData,
    });
  });
};