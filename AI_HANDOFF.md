# AI / CV Handoff

## What To Read First

- [API_LIST.md](./API_LIST.md)
- [src/utils/calculateLandmarkFeatures.js](./src/utils/calculateLandmarkFeatures.js)
- [src/controllers/postureController.js](./src/controllers/postureController.js)

## Main APIs For AI / CV Team

- `POST /landmark`
- `POST /posture/analyze`

## Coordinate Rules

- input coordinates are treated as `normalized`
- `x`, `y` are relative image coordinates, not pixel coordinates
- `z` is treated as relative depth, not absolute distance
- raw landmark fields supported:
  - `x`
  - `y`
  - `z`
  - `visibility`

## Required Landmarks

- `nose`
- `left_ear`
- `right_ear`
- `left_shoulder`
- `right_shoulder`

## Optional Landmarks

- `nose_tip`
- `mouth_left`
- `mouth_right`

## Nose Priority Rule

Backend behavior:

- if `nose_tip` exists, backend uses `nose_tip`
- if `nose_tip` is missing, backend falls back to pose `nose`

This is already implemented in backend logic.

## Side Selection Rule

You may send:

```json
{
  "reference_side": "left"
}
```

or

```json
{
  "reference_side": "right"
}
```

If not provided:

- backend selects the side with better landmark visibility
- selection is based on ear + shoulder visibility

## Standard Payload

```json
{
  "reference_side": "right",
  "landmarks": {
    "nose": { "x": 0.50, "y": 0.20, "z": -0.01, "visibility": 0.95 },
    "nose_tip": { "x": 0.53, "y": 0.21, "z": -0.02, "visibility": 0.99 },
    "left_ear": { "x": 0.46, "y": 0.22, "z": -0.01, "visibility": 0.31 },
    "right_ear": { "x": 0.64, "y": 0.26, "z": -0.04, "visibility": 0.96 },
    "left_shoulder": { "x": 0.44, "y": 0.41, "z": 0.01, "visibility": 0.35 },
    "right_shoulder": { "x": 0.56, "y": 0.41, "z": 0.02, "visibility": 0.97 },
    "mouth_left": { "x": 0.48, "y": 0.24, "z": -0.01, "visibility": 0.90 },
    "mouth_right": { "x": 0.52, "y": 0.24, "z": -0.01, "visibility": 0.90 }
  }
}
```

## What Backend Calculates

Backend computes:

- `forward_distance`
- `nose_shoulder_distance`
- `head_angle`
- `shoulder_width`
- `min_visibility`
- `avg_visibility`

It also stores:

- raw landmark values
- selected side values
- derived feature values

## Posture Classification Rule

Current backend posture thresholds:

- `head_angle <= 55`: `warning`
- `head_angle <= 50`: `danger`

Interpretation used by backend:

- more upright posture is closer to `90`
- more forward-head posture drops angle toward `0`

## Baseline Flow

### Save baseline

- send stable baseline posture to `POST /landmark`

### Analyze current frame

- send live frame landmarks to `POST /posture/analyze`

Backend will:

- compute current features
- compare against saved baseline
- return status and angle assessment

## Important Response Fields

From `POST /landmark`:

- `data.reference_side`
- `data.nose_source`
- `data.coordinate_space`
- `data.head_angle`

From `POST /posture/analyze`:

- `data.status`
- `data.angle_assessment.current_head_angle`
- `data.angle_assessment.baseline_head_angle`
- `data.diff.head_angle_diff`

## AI / CV Team Checklist

- confirm outgoing payload uses normalized coordinates
- include `visibility`
- include `nose_tip` when available
- include `reference_side` when side is known
- ensure required landmarks are always present
- verify current model output names match backend expected keys

## If Integration Fails

Check in order:

1. are required landmarks present
2. are values nested under `landmarks`
3. are `x` and `y` numeric
4. is `reference_side` valid when sent
5. is `nose_tip` sent under the exact key `nose_tip`

## Recommended Shared Validation

Before merging:

- send one known upright sample
- send one borderline warning sample
- send one clearly dangerous sample
- verify backend returns expected `head_angle` and `status`
