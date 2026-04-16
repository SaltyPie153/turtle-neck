# API List

## Base

- Base URL: `http://localhost:3000`
- Auth: JWT Bearer token
- Protected routes: send `Authorization: Bearer <token>`

## Auth

### `POST /auth/register`

- Auth: not required
- Content-Type: `multipart/form-data`
- Fields:
  - `username` required
  - `email` required
  - `password` required
  - `nickname` optional
  - `profile_image` optional image file

Example:

```http
POST /auth/register
Content-Type: multipart/form-data
```

Response:

```json
{
  "message": "회원가입 성공",
  "user": {
    "id": 1,
    "username": "tester",
    "email": "tester@example.com",
    "nickname": "Tester",
    "profile_image": "/uploads/profiles/profile_123.png"
  },
  "token": "<jwt>"
}
```

### `POST /auth/login`

- Auth: not required
- Content-Type: `application/json`

Request:

```json
{
  "email": "tester@example.com",
  "password": "password-123"
}
```

### `GET /auth/me`

- Auth: required
- Returns token-decoded user info

## User

### `GET /users/me`

- Auth: required
- Returns current user profile

### `PATCH /users/me`

- Auth: required
- Content-Type:
  - `application/json` for nickname/password only
  - `multipart/form-data` when uploading `profile_image`
- Fields:
  - `nickname` optional
  - `password` optional
  - `profile_image` optional image file

Response:

```json
{
  "message": "User profile updated successfully.",
  "data": {
    "id": 1,
    "username": "tester",
    "email": "tester@example.com",
    "nickname": "Updated Tester",
    "profile_image": "/uploads/profiles/profile_123.png",
    "created_at": "2026-04-16 12:00:00",
    "updated_at": "2026-04-16 12:30:00"
  }
}
```

## Landmark

### `POST /landmark`

- Auth: required
- Content-Type: `application/json`
- Purpose: save baseline landmark/posture data
- Coordinate space: normalized
- Raw landmark values: `x`, `y`, `z`, `visibility`

Standard request:

```json
{
  "reference_side": "right",
  "landmarks": {
    "nose": { "x": 0.5, "y": 0.2, "z": -0.01, "visibility": 0.97 },
    "nose_tip": { "x": 0.53, "y": 0.21, "z": -0.02, "visibility": 0.99 },
    "left_ear": { "x": 0.46, "y": 0.22, "z": -0.01, "visibility": 0.45 },
    "right_ear": { "x": 0.64, "y": 0.26, "z": -0.04, "visibility": 0.96 },
    "left_shoulder": { "x": 0.44, "y": 0.41, "z": 0.01, "visibility": 0.42 },
    "right_shoulder": { "x": 0.56, "y": 0.41, "z": 0.02, "visibility": 0.97 },
    "mouth_left": { "x": 0.48, "y": 0.24, "z": -0.01, "visibility": 0.9 },
    "mouth_right": { "x": 0.52, "y": 0.24, "z": -0.01, "visibility": 0.9 }
  }
}
```

Notes:

- `nose_tip` is used first when present
- If `nose_tip` is missing, backend falls back to pose `nose`
- `reference_side` can be `left` or `right`
- If no side hint is given, backend chooses the more reliable side by visibility

### `GET /landmark/latest`

- Auth: required
- Returns latest saved landmark row for the user

## Posture Analyze

### `POST /posture/analyze`

- Auth: required
- Content-Type: `application/json`
- Uses the same request format as `POST /landmark`
- Purpose: compare current posture against latest saved baseline

Current rules:

- `55` degrees or below: `warning`
- `50` degrees or below: `danger`

Response shape:

```json
{
  "message": "Posture analyzed successfully.",
  "data": {
    "current": {
      "head_angle": 48.3
    },
    "baseline": {
      "forward_distance": 0,
      "nose_shoulder_distance": 0,
      "head_angle": 87.1
    },
    "diff": {
      "forward_distance_diff": 0.18,
      "nose_shoulder_distance_diff": 0.1,
      "head_angle_diff": -38.8
    },
    "thresholds": {
      "warning_head_angle_max": 55,
      "danger_head_angle_max": 50
    },
    "angle_assessment": {
      "current_head_angle": 48.3,
      "baseline_head_angle": 87.1
    },
    "status": "danger"
  }
}
```

## Posture Log

### `POST /posture/log`

- Auth: required
- Content-Type: `application/json`
- Purpose: save analyzed posture usage blocks

Request:

```json
{
  "status": "warning",
  "duration_seconds": 12,
  "recorded_at": "2026-04-16T12:30:00Z"
}
```

Fields:

- `status`: `normal | warning | danger`
- `duration_seconds`: number >= 0
- `recorded_at`: optional ISO datetime string

## Dashboard

### `GET /dashboard/today`

- Auth: required
- Returns today summary

Response:

```json
{
  "message": "Today dashboard fetched successfully.",
  "data": {
    "total_usage_seconds": 900,
    "total_usage_minutes": 15,
    "normal_seconds": 600,
    "warning_seconds": 120,
    "danger_seconds": 180,
    "danger_count": 1,
    "good_posture_rate": 66.67
  }
}
```

### `GET /dashboard/weekly`

- Auth: required
- Returns 7-day chart data for graphs

Response:

```json
{
  "message": "Weekly dashboard fetched successfully.",
  "data": {
    "summary": {
      "total_usage_seconds": 600,
      "total_usage_minutes": 10,
      "normal_seconds": 300,
      "warning_seconds": 180,
      "danger_seconds": 120,
      "danger_count": 1,
      "good_posture_rate": 50
    },
    "chart": [
      {
        "date": "2026-04-16",
        "day_label": "Thu",
        "total_usage_seconds": 180,
        "total_usage_minutes": 3,
        "normal_seconds": 0,
        "warning_seconds": 180,
        "danger_seconds": 0,
        "danger_count": 0,
        "good_posture_rate": 0
      }
    ],
    "peak_usage_day": {
      "date": "2026-04-14",
      "day_label": "Tue",
      "total_usage_seconds": 300,
      "total_usage_minutes": 5
    }
  }
}
```

## Notifications

### `POST /notifications`

- Auth: required
- Content-Type: `application/json`

Request:

```json
{
  "status": "warning",
  "message": "Please fix your posture."
}
```

### `GET /notifications`

- Auth: required
- Returns notification list for current user

## Devices

### `POST /devices/register`

- Auth: required
- Content-Type: `application/json`
- Purpose: save or update FCM device token

Request:

```json
{
  "device_type": "web",
  "fcm_token": "token-123"
}
```

Allowed `device_type` values:

- `web`
- `android`
- `ios`

### `GET /devices`

- Auth: required
- Returns registered devices for current user

### `DELETE /devices`

- Auth: required
- Content-Type: `application/json`

Request:

```json
{
  "fcm_token": "token-123"
}
```

## Push

### `POST /push/send`

- Auth: required
- Content-Type: `application/json`
- Purpose: send push notification to all registered device tokens of a target user

Request:

```json
{
  "user_id": 1,
  "title": "Test push",
  "body": "Body text"
}
```

Response:

```json
{
  "message": "푸시 알림 전송 성공",
  "successCount": 1,
  "failureCount": 0
}
```

## Route Summary

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /landmark`
- `GET /landmark/latest`
- `POST /notifications`
- `GET /notifications`
- `POST /devices/register`
- `GET /devices`
- `DELETE /devices`
- `POST /push/send`
- `GET /users/me`
- `PATCH /users/me`
- `POST /posture/log`
- `GET /dashboard/today`
- `GET /dashboard/weekly`
- `POST /posture/analyze`
