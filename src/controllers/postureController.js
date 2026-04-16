const { db } = require('../config/db');
const calculateLandmarkFeatures = require('../utils/calculateLandmarkFeatures');

const WARNING_HEAD_ANGLE_DEGREES = 55;
const DANGER_HEAD_ANGLE_DEGREES = 50;

function normalizeHeadAngle(angle) {
  const numericAngle = Number(angle);

  if (Number.isNaN(numericAngle)) {
    return null;
  }

  return Number(
    (
      Math.atan2(
        Math.abs(Math.sin((numericAngle * Math.PI) / 180)),
        Math.abs(Math.cos((numericAngle * Math.PI) / 180))
      ) *
      (180 / Math.PI)
    ).toFixed(4)
  );
}

function classifyPostureByAngle(angle) {
  if (angle === null) {
    return 'unknown';
  }

  if (angle <= DANGER_HEAD_ANGLE_DEGREES) {
    return 'danger';
  }

  if (angle <= WARNING_HEAD_ANGLE_DEGREES) {
    return 'warning';
  }

  return 'normal';
}

exports.analyzePosture = (req, res) => {
  const userId = req.user.id;

  let currentFeatures;

  try {
    currentFeatures = calculateLandmarkFeatures(req.body);
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  db.get(
    `
      SELECT *
      FROM LandMark
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId],
    (err, baseline) => {
      if (err) {
        return res.status(500).json({
          message: 'Failed to fetch baseline posture.',
          error: err.message,
        });
      }

      if (!baseline) {
        return res.status(404).json({
          message: 'No baseline posture data found. Save a baseline posture first.',
        });
      }

      const forwardDistanceDiff =
        currentFeatures.forward_distance - baseline.forward_distance;
      const noseShoulderDistanceDiff =
        currentFeatures.nose_shoulder_distance - baseline.nose_shoulder_distance;

      const currentHeadAngle = normalizeHeadAngle(currentFeatures.head_angle);
      const baselineHeadAngle = normalizeHeadAngle(baseline.head_angle);
      const headAngleDiff =
        baselineHeadAngle === null
          ? null
          : Number((currentHeadAngle - baselineHeadAngle).toFixed(4));

      const status = classifyPostureByAngle(currentHeadAngle);

      return res.status(200).json({
        message: 'Posture analyzed successfully.',
        data: {
          current: currentFeatures,
          baseline: {
            forward_distance: baseline.forward_distance,
            nose_shoulder_distance: baseline.nose_shoulder_distance,
            head_angle: baselineHeadAngle,
          },
          diff: {
            forward_distance_diff: Number(forwardDistanceDiff.toFixed(4)),
            nose_shoulder_distance_diff: Number(noseShoulderDistanceDiff.toFixed(4)),
            head_angle_diff: headAngleDiff,
          },
          thresholds: {
            warning_head_angle_max: WARNING_HEAD_ANGLE_DEGREES,
            danger_head_angle_max: DANGER_HEAD_ANGLE_DEGREES,
          },
          angle_assessment: {
            current_head_angle: currentHeadAngle,
            baseline_head_angle: baselineHeadAngle,
          },
          status,
        },
      });
    }
  );
};
