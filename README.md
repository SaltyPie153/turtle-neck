# Sense Posture System Backend

Sense Posture System is a `Node.js + Express + SQLite` backend for webcam-based posture monitoring, dashboard aggregation, and Firebase Cloud Messaging alerts.

The server supports:

- JWT-based authentication
- user profile management with image upload
- baseline landmark storage
- posture analysis from MediaPipe landmark coordinates
- status heartbeat processing from CV
- daily and weekly dashboard aggregation
- FCM device registration and push delivery

## Tech Stack

- Node.js 22
- Express 5
- SQLite3
- JWT (`jsonwebtoken`)
- bcrypt
- multer
- Firebase Admin SDK

## Current Flow

There are two posture-related flows in the project.

### 1. Landmark baseline and analysis

- `POST /landmark`
  - stores the user's baseline landmark/features
  - baseline is maintained per user
- `POST /posture/analyze`
  - accepts raw landmark coordinates
  - calculates derived posture features on the server
  - returns `normal`, `warning`, or `danger`

### 2. Status heartbeat from CV

- `POST /posture/heartbeat`
  - accepts CV status only: `good`, `caution`, `bad`
  - backend tracks state duration per user
  - when status changes, the previous segment is written to `PostureLogs`
  - `bad` sustained for `5` seconds or more triggers a notification and push

Status mapping used internally:

- `good -> normal`
- `caution -> warning`
- `bad -> danger`

This means:

- dashboards aggregate from `PostureLogs`
- real-time raw heartbeats are tracked through `PostureHeartbeatState`
- frontend can stay simple and only display data

## Project Structure

```text
app.js
src/
  app.js
  config/
  controllers/
  middleware/
  routes/
  services/
  utils/
public/
  login.html
  camera.html
  weekly.html
test/
```

Main public pages:

- `/login.html`
- `/camera.html`
- `/weekly.html`

## Environment Variables

Create `.env` from `.env.example`.

Required minimum:

```env
PORT=3000
JWT_SECRET=change-me
DATABASE_PATH=./database.sqlite
WARNING_ALERT_MIN_DURATION_SECONDS=30
DANGER_ALERT_MIN_DURATION_SECONDS=5
BAD_ALERT_MIN_DURATION_SECONDS=5
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project-id","private_key_id":"your-private-key-id","private_key":"-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk@example.iam.gserviceaccount.com","client_id":"1234567890","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40example.iam.gserviceaccount.com"}
```

Notes:

- `JWT_SECRET` is required for server startup.
- Firebase service account is also required at runtime.
- Instead of `FIREBASE_SERVICE_ACCOUNT_JSON`, you can place `serviceAccountKey.json` in the project root.
- Do not commit `serviceAccountKey.json` or any real secret values.

## Install and Run

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Run tests:

```bash
npm test
```

Health check:

```text
GET /health
```

## Database Overview

Main tables:

- `Users`
- `LandMark`
- `Notifications`
- `UserDevices`
- `PostureLogs`
- `PostureHeartbeatState`

### LandMark

Stores baseline landmark coordinates and derived posture features such as:

- `forward_distance`
- `nose_shoulder_distance`
- `head_angle`
- `shoulder_width`
- `min_visibility`
- `avg_visibility`

### PostureLogs

Stores aggregated posture segments:

- `status`
- `duration_seconds`
- `created_at`

Dashboard endpoints aggregate from this table.

### PostureHeartbeatState

Stores the current heartbeat state per user:

- `current_status`
- `started_at`
- `last_seen_at`
- `alert_sent`

This table supports the status-only CV integration flow.

## API Summary

All protected endpoints require:

```text
Authorization: Bearer <token>
```

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Users

- `GET /users/me`
- `PATCH /users/me`

Profile image upload uses `multer` and stores only the server file path in `Users.profile_image`.

### Landmark and Posture

- `POST /landmark`
- `GET /landmark/latest`
- `POST /posture/analyze`
- `POST /posture/heartbeat`
- `POST /posture/log`

### Dashboard

- `GET /dashboard/today`
- `GET /dashboard/weekly`

### Notifications and Devices

- `GET /notifications`
- `POST /devices/register`
- `GET /devices`
- `DELETE /devices`
- `POST /push/send`

For detailed request and response examples, see:

- [API_LIST.md](./API_LIST.md)

## Heartbeat API Contract

CV can send posture state only.

Request:

```json
{
  "status": "bad"
}
```

Allowed values:

- `good`
- `caution`
- `bad`

Backend behavior:

1. starts tracking when the first heartbeat arrives
2. keeps updating the same segment while the status stays unchanged
3. writes the previous segment to `PostureLogs` when status changes
4. sends an alert once when `bad` lasts at least `5` seconds

This flow is intended for CV-first integration where backend owns duration calculation.

## Landmark Payload Shape

When using raw landmark analysis, the backend expects a nested landmark object similar to:

```json
{
  "landmarks": {
    "nose": { "x": 0.50, "y": 0.20, "z": -0.01, "visibility": 0.95 },
    "left_ear": { "x": 0.46, "y": 0.22, "z": -0.01, "visibility": 0.31 },
    "right_ear": { "x": 0.64, "y": 0.26, "z": -0.04, "visibility": 0.96 },
    "left_shoulder": { "x": 0.44, "y": 0.41, "z": 0.01, "visibility": 0.35 },
    "right_shoulder": { "x": 0.56, "y": 0.41, "z": 0.02, "visibility": 0.97 },
    "nose_tip": { "x": 0.53, "y": 0.21, "z": -0.02, "visibility": 0.99 }
  }
}
```

Minimum required landmarks:

- `nose`
- `left_ear`
- `right_ear`
- `left_shoulder`
- `right_shoulder`

## Dashboard Data Source

`/dashboard/today` and `/dashboard/weekly` aggregate from `PostureLogs`.

This is important:

- if `PostureLogs` is empty, dashboard values will be `0`
- weekly charts depend on stored log segments, not directly on raw landmarks

Sample weekly seed files in this repository:

- [sample_weekly_posture_logs.json](./sample_weekly_posture_logs.json)
- [sample_weekly_posture_logs.sql](./sample_weekly_posture_logs.sql)

## Frontend / Remote Testing

For local testing:

- backend: `http://localhost:3000`

If a remote frontend teammate needs access, expose the server with a tunnel such as `ngrok`.

Example:

```bash
ngrok http 3000
```

Use the `Forwarding` URL from ngrok as the API base URL.

Do not use:

```text
http://127.0.0.1:4040
```

That address is only the local ngrok inspection UI.

## Related Documents

- [AI_HANDOFF.md](./AI_HANDOFF.md)
- [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md)
- [API_LIST.md](./API_LIST.md)
- [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

## Notes

- SQLite schema updates add missing columns automatically, but existing tables are not fully recreated.
- `LandMark` and `PostureLogs` are indexed for user/time based reads.
- Push notifications are sent only to devices registered to the authenticated user.
- Runtime requires Firebase credentials, but tests inject a dummy service account automatically.
