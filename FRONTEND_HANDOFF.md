# Frontend Handoff

## Read First

- [API_LIST.md](./API_LIST.md)
- [README.md](./README.md)

## Frontend Scope

Frontend is expected to:

- authenticate users
- load and update profile data
- register web FCM token
- load dashboard data
- render notifications
- display posture-related UI from backend data

Frontend is not expected to:

- calculate posture duration
- classify `good / caution / bad`
- send continuous posture heartbeats

Those responsibilities are now owned by CV and backend.

## Main APIs For Frontend

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### User

- `GET /users/me`
- `PATCH /users/me`

### Dashboard

- `GET /dashboard/today`
- `GET /dashboard/weekly`

### Notifications / Devices

- `GET /notifications`
- `POST /devices/register`
- `GET /devices`
- `DELETE /devices`

### Optional / Admin-Test Endpoints

- `POST /push/send`
- `GET /landmark/latest`

## Auth Flow

### 1. Login

- call `POST /auth/login`
- save returned JWT token
- send token on protected routes with:

```http
Authorization: Bearer <token>
```

### 2. Session Check

- call `GET /auth/me` to verify token validity

## Profile Flow

### `GET /users/me`

Use this to load:

- username
- email
- nickname
- profile_image

### `PATCH /users/me`

Use this to update:

- nickname
- password
- profile image

If uploading image:

- use `multipart/form-data`
- field name must be `profile_image`

## Dashboard Flow

### Today Dashboard

Use `GET /dashboard/today`

Important fields:

- `data.total_usage_minutes`
- `data.normal_seconds`
- `data.warning_seconds`
- `data.danger_seconds`
- `data.danger_count`
- `data.good_posture_rate`

### Weekly Dashboard

Use `GET /dashboard/weekly`

Important fields:

- `data.summary`
- `data.chart`
- `data.peak_usage_day`

Useful `chart` fields:

- `date`
- `day_label`
- `total_usage_minutes`
- `normal_seconds`
- `warning_seconds`
- `danger_seconds`
- `good_posture_rate`

Recommended graph usage:

- simple bar chart: `total_usage_minutes`
- stacked bar chart:
  - `normal_seconds`
  - `warning_seconds`
  - `danger_seconds`

## Notifications / Push Flow

### Register web FCM token

Use `POST /devices/register`

Request:

```json
{
  "device_type": "web",
  "fcm_token": "token-123"
}
```

For web, `device_type` must be `web`.

### Load notification list

Use `GET /notifications`

## Frontend Does Not Need These For Main Flow

These APIs exist, but frontend does not need to drive them in the current contract:

- `POST /posture/heartbeat`
- `POST /posture/log`
- `POST /posture/analyze`

Reason:

- CV sends posture state heartbeat
- backend calculates duration and stores logs
- dashboard already reads aggregated values from `PostureLogs`

## Request Notes

### JSON routes

Use:

```http
Content-Type: application/json
```

### File upload routes

Use:

```http
Content-Type: multipart/form-data
```

## Frontend Checklist

- token is saved after login
- protected routes include Bearer token
- profile image upload uses `profile_image`
- weekly chart handles 7 items
- empty dashboard state is handled when `PostureLogs` is empty
- notification list handles empty state

## If Integration Breaks

Check in order:

1. token included or not
2. request path matches `API_LIST.md`
3. `multipart/form-data` vs `application/json`
4. field names are correct
5. dashboard data is actually present in `PostureLogs`
