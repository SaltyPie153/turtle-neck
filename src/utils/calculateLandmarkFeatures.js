function calculateLandmarkFeatures(raw) {
    const {
        nose_x, nose_y,
        left_ear_x, left_ear_y,
        right_ear_x, right_ear_y,
        left_shoulder_x, left_shoulder_y,
        right_shoulder_x, right_shoulder_y,
    } = raw;

    const values = [
        nose_x, nose_y,
        left_ear_x, left_ear_y,
        right_ear_x, right_ear_y,
        left_shoulder_x, left_shoulder_y,
        right_shoulder_x, right_shoulder_y,
    ];

    const hasInvalidValue = values.some(
        (value) => value === undefined || value === null || Number.isNaN(Number(value))
    );

    if (hasInvalidValue) {
        throw new Error('랜드마크 원본값이 올바르지 않습니다.');
    }

    const nNoseX = Number(nose_x);
    const nNoseY = Number(nose_y);
    const nLeftEarX = Number(left_ear_x);
    const nLeftEarY = Number(left_ear_y);
    const nRightEarX = Number(right_ear_x);
    const nRightEarY = Number(right_ear_y);
    const nLeftShoulderX = Number(left_shoulder_x);
    const nLeftShoulderY = Number(left_shoulder_y);
    const nRightShoulderX = Number(right_shoulder_x);
    const nRightShoulderY = Number(right_shoulder_y);

    const shoulder_center_x = (nLeftShoulderX + nRightShoulderX) / 2;
    const shoulder_center_y = (nLeftShoulderY + nRightShoulderY) / 2;

    const ear_center_x = (nLeftEarX + nRightEarX) / 2;
    const ear_center_y = (nLeftEarY + nRightEarY) / 2;

    const forward_distance = ear_center_x - shoulder_center_x;
    const nose_shoulder_distance = nNoseX - shoulder_center_x;
    
    const head_angle =
    Math.atan2(
        ear_center_y - shoulder_center_y,
        ear_center_x - shoulder_center_x
    ) * (180 / Math.PI);
    
    const shoulder_width = Math.sqrt(
        Math.pow(nRightShoulderX - nLeftShoulderX, 2) +
        Math.pow(nRightShoulderY - nLeftShoulderY, 2)
    );
    
    return {
        nose_x: nNoseX,
        nose_y: nNoseY,
        left_ear_x: nLeftEarX,
        left_ear_y: nLeftEarY,
        right_ear_x: nRightEarX,
        right_ear_y: nRightEarY,
        left_shoulder_x: nLeftShoulderX,
        left_shoulder_y: nLeftShoulderY,
        right_shoulder_x: nRightShoulderX,
        right_shoulder_y: nRightShoulderY,
        shoulder_center_x, shoulder_center_y,
        ear_center_x, ear_center_y,
        forward_distance,
        nose_shoulder_distance,
        head_angle,
        shoulder_width,
    };
}

module.exports = calculateLandmarkFeatures;