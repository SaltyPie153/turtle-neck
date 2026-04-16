# Frontend Handoff

## What To Read First

- [API_LIST.md](./API_LIST.md)

## Main APIs For Frontend

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### User

- `GET /users/me`
- `PATCH /users/me`

### Dashboard

- `GET /dashboard/today`
- `GET /dashboard/weekly`

### Posture / Logging

- `POST /posture/log`
- `POST /posture/analyze`
- `GET /landmark/latest`

### Notifications / Push

- `GET /notifications`
- `POST /devices/register`

## Frontend Flow

### 1. Login

- Call `POST /auth/login`
- Save returned JWT token
- Send token on protected routes with:

```http
Authorization: Bearer <token>
```

### 2. My Page / Profile

- Use `GET /users/me` to load profile
- Use `PATCH /users/me` to update:
  - nickname
  - password
  - profile image

If uploading image:

- send `multipart/form-data`
- field name must be `profile_image`

### 3. Dashboard

#### Today

- Use `GET /dashboard/today`
- Useful fields:
  - `total_usage_minutes`
  - `normal_seconds`
  - `warning_seconds`
  - `danger_seconds`
  - `danger_count`
  - `good_posture_rate`

#### Weekly

- Use `GET /dashboard/weekly`
- For graph, use `data.chart`
- Each item includes:
  - `date`
  - `day_label`
  - `total_usage_minutes`
  - `normal_seconds`
  - `warning_seconds`
  - `danger_seconds`

Recommended graph usage:

- simple bar chart: `total_usage_minutes`
- stacked bar chart:
  - `normal_seconds`
  - `warning_seconds`
  - `danger_seconds`

### 4. Posture Session Flow

- Frontend gets webcam stream with browser `getUserMedia`
- Frontend or AI/CV module extracts landmarks
- Send current landmarks to `POST /posture/analyze`
- Use returned `status` for current posture UI
- Save posture block to `POST /posture/log`

### 5. Push Notifications

- Register web FCM token with `POST /devices/register`
- `device_type` for web must be `web`

## Request Notes

### JSON routes

Use `Content-Type: application/json`

### File upload routes

Use `multipart/form-data`

## Important Response Fields

### From `POST /posture/analyze`

- `data.status`
- `data.angle_assessment.current_head_angle`
- `data.thresholds.warning_head_angle_max`
- `data.thresholds.danger_head_angle_max`

### From `GET /dashboard/weekly`

- `data.summary`
- `data.chart`
- `data.peak_usage_day`

## Things Frontend Does Not Need To Implement

- Webcam hardware connection API on backend
- Landmark feature extraction math
- Posture threshold logic

Those are already handled by:

- browser webcam APIs
- backend landmark calculation
- backend posture analysis logic

## If Something Breaks

Check in order:

1. token included or not
2. request body shape matches `API_LIST.md`
3. `multipart/form-data` vs `application/json`
4. required field names are correct

## Recommended Frontend Test Targets

- login success
- dashboard loads with token
- profile update works with image
- weekly chart renders 7 items
- analyze response changes UI state
