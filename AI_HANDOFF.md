# AI / CV Handoff

## Read First

- [API_LIST.md](./API_LIST.md)
- [README.md](./README.md)

## Current Integration Contract

CV is expected to send posture state heartbeat.

Primary API:

- `POST /posture/heartbeat`

Current state values:

- `good`
- `caution`
- `bad`

Backend responsibilities:

- track how long the current state lasts
- write previous segments to `PostureLogs` when the state changes
- map values internally:
  - `good -> normal`
  - `caution -> warning`
  - `bad -> danger`
- send notification and push once when `bad` lasts at least `5` seconds

This means CV does not need to calculate:

- `duration_seconds`
- alert threshold timing
- dashboard aggregates

## Required API For CV

### `POST /posture/heartbeat`

- Auth: required
- Content-Type: `application/json`

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

Recommended send timing:

- send immediately when state changes
- while state remains the same, keep sending heartbeat periodically
- `1` second interval is a reasonable default

## Expected Backend Behavior

Example:

1. CV sends `good`
2. CV later sends `caution`
3. backend saves previous `good` segment into `PostureLogs`
4. CV keeps sending `bad`
5. once `bad` lasts `5` seconds, backend sends alert once
6. when status changes away from `bad`, backend saves the `bad` segment into `PostureLogs`

## Optional Landmark APIs

These APIs still exist, but they are no longer the main CV contract for live posture session flow:

- `POST /landmark`
- `POST /posture/analyze`

Use them only when needed for:

- saving a baseline landmark set
- debugging posture feature calculations
- validating raw landmark parsing on the backend

## Optional Landmark Payload Shape

If you need to send raw landmark coordinates for baseline or debug analysis, use:

```json
{
  "reference_side": "right",
  "landmarks": {
    "nose": { "x": 0.50, "y": 0.20, "z": -0.01, "visibility": 0.95 },
    "nose_tip": { "x": 0.53, "y": 0.21, "z": -0.02, "visibility": 0.99 },
    "left_ear": { "x": 0.46, "y": 0.22, "z": -0.01, "visibility": 0.31 },
    "right_ear": { "x": 0.64, "y": 0.26, "z": -0.04, "visibility": 0.96 },
    "left_shoulder": { "x": 0.44, "y": 0.41, "z": 0.01, "visibility": 0.35 },
    "right_shoulder": { "x": 0.56, "y": 0.41, "z": 0.02, "visibility": 0.97 }
  }
}
```

Required landmarks for raw analysis:

- `nose`
- `left_ear`
- `right_ear`
- `left_shoulder`
- `right_shoulder`

Optional landmarks:

- `nose_tip`
- `mouth_left`
- `mouth_right`

## What CV No Longer Needs To Send

In the current contract, CV does not need to send:

- `duration_seconds`
- `recorded_at`
- `normal / warning / danger`

Backend handles:

- duration tracking
- internal status mapping
- alert timing
- dashboard log generation

## CV Checklist

- status values match exactly:
  - `good`
  - `caution`
  - `bad`
- heartbeat keeps coming while the same state continues
- heartbeat interval is stable enough for duration tracking
- protected requests include Bearer token

## If Integration Breaks

Check in order:

1. token included or not
2. request path is `/posture/heartbeat`
3. `status` value is one of `good | caution | bad`
4. heartbeat is actually being sent repeatedly for sustained states
5. backend is running with valid Firebase credentials if alert push is expected
