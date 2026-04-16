const { after, afterEach, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

process.env.JWT_SECRET = 'test-secret';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aix-api-test-'));
process.env.DATABASE_PATH = path.join(tempDir, 'test.sqlite');
const profileUploadDir = path.join(__dirname, '../public/uploads/profiles');
const TEST_USER_PASSWORD = 'password-123';

const jwt = require('jsonwebtoken');
const app = require('../src/app');
const admin = require('../src/config/firebaseAdmin');
const { db, initDatabase } = require('../src/config/db');
const messagingService = admin.messaging();

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

async function createTestUser() {
  const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
  const result = await run(
    `INSERT INTO Users (username, email, password, nickname)
     VALUES (?, ?, ?, ?)`,
    ['tester', 'tester@example.com', hashedPassword, 'Tester']
  );

  return {
    id: result.lastID,
    username: 'tester',
    email: 'tester@example.com',
    password: TEST_USER_PASSWORD,
  };
}

function createAuthToken(user) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function registerUploadedFile(profileImagePath) {
  if (!profileImagePath || typeof profileImagePath !== 'string') {
    return;
  }

  uploadedTestFiles.push(path.join(profileUploadDir, path.basename(profileImagePath)));
}

function createLandmarkPayload({
  referenceSide = 'right',
  nose = { x: 0.5, y: 0.2, z: -0.01, visibility: 0.99 },
  leftEar = { x: 0.46, y: 0.22, z: -0.01, visibility: 0.95 },
  rightEar = { x: 0.56, y: 0.22, z: -0.01, visibility: 0.99 },
  leftShoulder = { x: 0.44, y: 0.4, z: 0.01, visibility: 0.95 },
  rightShoulder = { x: 0.56, y: 0.4, z: 0.01, visibility: 0.99 },
} = {}) {
  return {
    reference_side: referenceSide,
    landmarks: {
      nose,
      left_ear: leftEar,
      right_ear: rightEar,
      left_shoulder: leftShoulder,
      right_shoulder: rightShoulder,
    },
  };
}

let server;
let baseUrl;
let authToken;
let currentUser;
let uploadedTestFiles = [];
const originalSendEachForMulticast = messagingService.sendEachForMulticast;

before(async () => {
  await initDatabase();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await run('DELETE FROM PostureLogs');
  await run('DELETE FROM UserDevices');
  await run('DELETE FROM Notifications');
  await run('DELETE FROM LandMark');
  await run('DELETE FROM Users');
  uploadedTestFiles = [];

  currentUser = await createTestUser();
  authToken = createAuthToken(currentUser);
});

afterEach(() => {
  for (const filePath of uploadedTestFiles) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  messagingService.sendEachForMulticast = originalSendEachForMulticast;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

  await closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Posture log API', () => {
  test('POST /posture/log saves a posture log', async () => {
    const response = await fetch(`${baseUrl}/posture/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'warning',
        duration_seconds: 12.4,
        recorded_at: '2026-04-16T12:30:00Z',
      }),
    });

    assert.equal(response.status, 201);

    const body = await response.json();

    assert.equal(body.data.status, 'warning');
    assert.equal(body.data.duration_seconds, 12);
    assert.ok(body.data.created_at);
  });

  test('POST /posture/log rejects invalid status', async () => {
    const response = await fetch(`${baseUrl}/posture/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'bad',
        duration_seconds: 10,
      }),
    });

    assert.equal(response.status, 400);
  });
});

describe('Auth API', () => {
  test('POST /auth/register creates a user with profile image upload', async () => {
    const formData = new FormData();
    formData.append('username', 'newuser');
    formData.append('email', 'newuser@example.com');
    formData.append('password', 'register-password');
    formData.append('nickname', 'New User');
    formData.append(
      'profile_image',
      new Blob(['register-image'], { type: 'image/png' }),
      'register.png'
    );

    const response = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(response.status, 201);

    const body = await response.json();
    assert.equal(body.user.email, 'newuser@example.com');
    assert.equal(body.user.nickname, 'New User');
    assert.ok(body.token);
    assert.ok(body.user.profile_image.startsWith('/uploads/profiles/profile_'));

    registerUploadedFile(body.user.profile_image);
  });

  test('POST /auth/register rejects duplicate email', async () => {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'tester2',
        email: 'tester@example.com',
        password: 'another-password',
      }),
    });

    assert.equal(response.status, 409);
  });

  test('POST /auth/login returns a token for a valid user', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'tester@example.com',
        password: TEST_USER_PASSWORD,
      }),
    });

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.ok(body.token);
    assert.equal(body.user.email, 'tester@example.com');
  });

  test('GET /auth/me returns the authenticated user', async () => {
    const response = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.user.email, 'tester@example.com');
    assert.equal(body.user.username, 'tester');
  });
});

describe('User profile API', () => {
  test('PATCH /users/me updates nickname and password', async () => {
    const response = await fetch(`${baseUrl}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        nickname: 'Updated Tester',
        password: 'new-password-123',
      }),
    });

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.data.nickname, 'Updated Tester');

    const userRow = await get(
      `SELECT nickname, password
       FROM Users
       WHERE email = ?`,
      ['tester@example.com']
    );

    assert.equal(userRow.nickname, 'Updated Tester');
    assert.notEqual(userRow.password, 'new-password-123');
    assert.equal(
      await bcrypt.compare('new-password-123', userRow.password),
      true
    );
  });

  test('GET /users/me returns the current user profile', async () => {
    const response = await fetch(`${baseUrl}/users/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.data.email, 'tester@example.com');
    assert.equal(body.data.nickname, 'Tester');
  });

  test('PATCH /users/me uploads a profile image with multipart form-data', async () => {
    const formData = new FormData();
    formData.append(
      'profile_image',
      new Blob(['fake-image-bytes'], { type: 'image/png' }),
      'avatar.png'
    );
    formData.append('nickname', 'Image Tester');

    const response = await fetch(`${baseUrl}/users/me`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.data.nickname, 'Image Tester');
    assert.ok(body.data.profile_image.startsWith('/uploads/profiles/profile_'));

    registerUploadedFile(body.data.profile_image);
    assert.equal(
      fs.existsSync(path.join(profileUploadDir, path.basename(body.data.profile_image))),
      true
    );
  });
});

describe('Notification API', () => {
  test('POST /notifications creates a notification and GET /notifications lists it', async () => {
    const createResponse = await fetch(`${baseUrl}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'warning',
        message: 'Please fix your posture.',
      }),
    });

    assert.equal(createResponse.status, 201);

    const listResponse = await fetch(`${baseUrl}/notifications`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(listResponse.status, 200);

    const notifications = await listResponse.json();
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].status, 'warning');
    assert.equal(notifications[0].message, 'Please fix your posture.');
  });
});

describe('Device API', () => {
  test('POST /devices/register creates a device, GET /devices lists it, and DELETE /devices removes it', async () => {
    const registerResponse = await fetch(`${baseUrl}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        device_type: 'web',
        fcm_token: 'token-123',
      }),
    });

    assert.equal(registerResponse.status, 201);

    const listResponse = await fetch(`${baseUrl}/devices`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(listResponse.status, 200);

    const devices = await listResponse.json();
    assert.equal(devices.length, 1);
    assert.equal(devices[0].fcm_token, 'token-123');

    const deleteResponse = await fetch(`${baseUrl}/devices`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        fcm_token: 'token-123',
      }),
    });

    assert.equal(deleteResponse.status, 200);

    const deleteBody = await deleteResponse.json();
    assert.equal(deleteBody.deletedCount, 1);
  });

  test('POST /devices/register updates an existing device token owner info', async () => {
    const firstResponse = await fetch(`${baseUrl}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        device_type: 'web',
        fcm_token: 'token-update',
      }),
    });

    assert.equal(firstResponse.status, 201);

    const secondResponse = await fetch(`${baseUrl}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        device_type: 'android',
        fcm_token: 'token-update',
      }),
    });

    assert.equal(secondResponse.status, 200);

    const deviceRow = await get(
      `SELECT device_type
       FROM UserDevices
       WHERE fcm_token = ?`,
      ['token-update']
    );

    assert.equal(deviceRow.device_type, 'android');
  });
});

describe('Landmark API', () => {
  test('POST /landmark saves landmark data and GET /landmark/latest returns it', async () => {
    const payload = {
      reference_side: 'right',
      landmarks: {
        nose: { x: 0.5, y: 0.2, z: -0.01, visibility: 0.97 },
        nose_tip: { x: 0.53, y: 0.21, z: -0.02, visibility: 0.99 },
        left_ear: { x: 0.46, y: 0.22, z: -0.01, visibility: 0.45 },
        right_ear: { x: 0.64, y: 0.26, z: -0.04, visibility: 0.96 },
        left_shoulder: { x: 0.44, y: 0.41, z: 0.01, visibility: 0.42 },
        right_shoulder: { x: 0.56, y: 0.41, z: 0.02, visibility: 0.97 },
        mouth_left: { x: 0.48, y: 0.24, z: -0.01, visibility: 0.9 },
        mouth_right: { x: 0.52, y: 0.24, z: -0.01, visibility: 0.9 },
      },
    };

    const saveResponse = await fetch(`${baseUrl}/landmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(saveResponse.status, 201);

    const saveBody = await saveResponse.json();
    assert.equal(saveBody.data.nose_source, 'face_detection_nose_tip');
    assert.equal(saveBody.data.reference_side, 'right');
    assert.equal(saveBody.data.coordinate_space, 'normalized');
    assert.equal(saveBody.data.nose_x, 0.53);

    const latestResponse = await fetch(`${baseUrl}/landmark/latest`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(latestResponse.status, 200);

    const latestBody = await latestResponse.json();
    assert.equal(latestBody.nose_x, 0.53);
    assert.equal(latestBody.right_ear_x, 0.64);
    assert.equal(latestBody.right_shoulder_x, 0.56);
  });
});

describe('Push API', () => {
  test('POST /push/send rejects missing parameters', async () => {
    const response = await fetch(`${baseUrl}/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        title: 'Missing body',
      }),
    });

    assert.equal(response.status, 400);
  });

  test('POST /push/send returns 404 when the user has no registered device tokens', async () => {
    const response = await fetch(`${baseUrl}/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        title: 'Test title',
        body: 'Test body',
      }),
    });

    assert.equal(response.status, 404);
  });

  test('POST /push/send sends push notification when a token exists', async () => {
    const registerResponse = await fetch(`${baseUrl}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        device_type: 'web',
        fcm_token: 'push-token-123',
      }),
    });

    assert.equal(registerResponse.status, 201);

    messagingService.sendEachForMulticast = async ({ tokens, notification }) => {
      assert.deepEqual(tokens, ['push-token-123']);
      assert.equal(notification.title, 'Test push');
      assert.equal(notification.body, 'Body text');

      return {
        successCount: 1,
        failureCount: 0,
      };
    };

    const response = await fetch(`${baseUrl}/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        title: 'Test push',
        body: 'Body text',
      }),
    });

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.successCount, 1);
    assert.equal(body.failureCount, 0);
  });
});

describe('Dashboard API', () => {
  test('GET /dashboard/today returns aggregated data', async () => {
    const requests = [
      { status: 'normal', duration_seconds: 600, recorded_at: '2026-04-16T09:00:00Z' },
      { status: 'warning', duration_seconds: 120, recorded_at: '2026-04-16T09:20:00Z' },
      { status: 'danger', duration_seconds: 180, recorded_at: '2026-04-16T09:30:00Z' },
    ];

    for (const payload of requests) {
      const response = await fetch(`${baseUrl}/posture/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(response.status, 201);
    }

    const response = await fetch(`${baseUrl}/dashboard/today`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.data.total_usage_seconds, 900);
    assert.equal(body.data.normal_seconds, 600);
    assert.equal(body.data.warning_seconds, 120);
    assert.equal(body.data.danger_seconds, 180);
    assert.equal(body.data.danger_count, 1);
    assert.equal(body.data.good_posture_rate, 66.67);
  });

  test('GET /dashboard/weekly returns 7 chart items and summary', async () => {
    const requests = [
      { status: 'normal', duration_seconds: 300, recorded_at: '2026-04-14T08:00:00Z' },
      { status: 'danger', duration_seconds: 120, recorded_at: '2026-04-15T08:00:00Z' },
      { status: 'warning', duration_seconds: 180, recorded_at: '2026-04-16T08:00:00Z' },
    ];

    for (const payload of requests) {
      const response = await fetch(`${baseUrl}/posture/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(response.status, 201);
    }

    const response = await fetch(`${baseUrl}/dashboard/weekly`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.data.chart.length, 7);
    assert.equal(body.data.summary.total_usage_seconds, 600);
    assert.equal(body.data.summary.normal_seconds, 300);
    assert.equal(body.data.summary.warning_seconds, 180);
    assert.equal(body.data.summary.danger_seconds, 120);
    assert.equal(body.data.summary.danger_count, 1);
    assert.ok(body.data.peak_usage_day);
  });
});

describe('Posture analyze API', () => {
  test('POST /posture/analyze returns danger when the angle is below the danger threshold', async () => {
    const baselineResponse = await fetch(`${baseUrl}/landmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(
        createLandmarkPayload({
          referenceSide: 'right',
          rightEar: { x: 0.56, y: 0.22, z: -0.01, visibility: 0.99 },
          rightShoulder: { x: 0.56, y: 0.4, z: 0.01, visibility: 0.99 },
        })
      ),
    });

    assert.equal(baselineResponse.status, 201);

    const analyzeResponse = await fetch(`${baseUrl}/posture/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(
        createLandmarkPayload({
          referenceSide: 'right',
          rightEar: { x: 0.74, y: 0.29, z: -0.04, visibility: 0.99 },
          rightShoulder: { x: 0.56, y: 0.4, z: 0.01, visibility: 0.99 },
        })
      ),
    });

    assert.equal(analyzeResponse.status, 200);

    const body = await analyzeResponse.json();
    assert.equal(body.data.status, 'danger');
    assert.equal(body.data.thresholds.warning_head_angle_max, 55);
    assert.equal(body.data.thresholds.danger_head_angle_max, 50);
    assert.ok(body.data.angle_assessment.current_head_angle < 50);
  });

  test('POST /posture/analyze returns 404 without baseline posture data', async () => {
    const response = await fetch(`${baseUrl}/posture/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(createLandmarkPayload()),
    });

    assert.equal(response.status, 404);
  });
});
