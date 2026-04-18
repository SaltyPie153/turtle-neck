const { after, afterEach, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

process.env.JWT_SECRET = 'test-secret';

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  type: 'service_account',
  project_id: 'sense-posture-test',
  private_key_id: 'test-private-key-id',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  client_email: 'firebase-adminsdk-test@sense-posture-test.iam.gserviceaccount.com',
  client_id: '123456789012345678901',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-test%40sense-posture-test.iam.gserviceaccount.com',
});

const tempRootDir = path.join(__dirname, '.tmp');
if (!fs.existsSync(tempRootDir)) {
  fs.mkdirSync(tempRootDir, { recursive: true });
}
const tempDir = fs.mkdtempSync(path.join(tempRootDir, 'aix-api-test-'));
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

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
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

async function createTestUser({
  username = 'tester',
  email = 'tester@example.com',
  nickname = 'Tester',
  password = TEST_USER_PASSWORD,
} = {}) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await run(
    `INSERT INTO Users (username, email, password, nickname)
     VALUES (?, ?, ?, ?)`,
    [username, email, hashedPassword, nickname]
  );

  return {
    id: result.lastID,
    username,
    email,
    password,
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

function isoAtDaysOffset(daysOffset, hours, minutes = 0, seconds = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysOffset);
  date.setUTCHours(hours, minutes, seconds, 0);
  return date.toISOString();
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
  await run('DELETE FROM PostureHeartbeatState');
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
    assert.equal(body.alert.triggered, false);
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

  test('POST /posture/log creates an alert notification when duration exceeds the threshold', async () => {
    const registerResponse = await fetch(`${baseUrl}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        device_type: 'web',
        fcm_token: 'alert-token-123',
      }),
    });

    assert.equal(registerResponse.status, 201);

    messagingService.sendEachForMulticast = async ({ tokens, notification }) => {
      assert.deepEqual(tokens, ['alert-token-123']);
      assert.equal(notification.title, 'Posture Alert');
      assert.match(notification.body, /Danger posture detected/);

      return {
        successCount: 1,
        failureCount: 0,
      };
    };

    const response = await fetch(`${baseUrl}/posture/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'danger',
        duration_seconds: 12,
        recorded_at: '2026-04-16T12:30:00Z',
      }),
    });

    assert.equal(response.status, 201);

    const body = await response.json();
    assert.equal(body.alert.triggered, true);
    assert.equal(body.alert.push.delivered, true);
    assert.equal(body.alert.push.successCount, 1);

    const notifications = await all(
      `SELECT status, message
       FROM Notifications
       WHERE user_id = ?`,
      [currentUser.id]
    );

    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].status, 'danger');
    assert.match(notifications[0].message, /Danger posture detected/);
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

  test('POST /auth/register cleans up uploaded file when duplicate email is rejected', async () => {
    const beforeFileNames = fs
      .readdirSync(profileUploadDir)
      .filter((fileName) => fileName.startsWith('profile_'))
      .sort();

    const formData = new FormData();
    formData.append('username', 'duplicate-user');
    formData.append('email', 'tester@example.com');
    formData.append('password', 'another-password');
    formData.append(
      'profile_image',
      new Blob(['duplicate-image'], { type: 'image/png' }),
      'duplicate.png'
    );

    const response = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(response.status, 409);

    const afterFileNames = fs
      .readdirSync(profileUploadDir)
      .filter((fileName) => fileName.startsWith('profile_'))
      .sort();
    assert.deepEqual(afterFileNames, beforeFileNames);
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
    assert.equal(latestBody.nose_source, 'face_detection_nose_tip');
    assert.equal(latestBody.nose_x, 0.53);
    assert.equal(latestBody.pose_nose_x, 0.5);
    assert.equal(latestBody.nose_tip_x, 0.53);
    assert.equal(latestBody.right_ear_x, 0.64);
    assert.equal(latestBody.right_shoulder_x, 0.56);
  });

  test('POST /landmark keeps a single baseline row per user', async () => {
    const firstResponse = await fetch(`${baseUrl}/landmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(
        createLandmarkPayload({
          referenceSide: 'right',
          rightEar: { x: 0.56, y: 0.22, z: -0.01, visibility: 0.99 },
        })
      ),
    });

    assert.equal(firstResponse.status, 201);

    const firstBody = await firstResponse.json();

    const secondResponse = await fetch(`${baseUrl}/landmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(
        createLandmarkPayload({
          referenceSide: 'right',
          rightEar: { x: 0.72, y: 0.3, z: -0.05, visibility: 0.99 },
        })
      ),
    });

    assert.equal(secondResponse.status, 201);

    const secondBody = await secondResponse.json();
    assert.equal(secondBody.landmarkId, firstBody.landmarkId);

    const countRow = await get(
      `SELECT COUNT(*) AS count
       FROM LandMark
       WHERE user_id = ?`,
      [currentUser.id]
    );

    assert.equal(countRow.count, 1);

    const latestResponse = await fetch(`${baseUrl}/landmark/latest`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(latestResponse.status, 200);

    const latestBody = await latestResponse.json();
    assert.equal(latestBody.right_ear_x, 0.72);
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

  test('POST /push/send rejects attempts to send to another user', async () => {
    const otherUser = await createTestUser({
      username: 'other-user',
      email: 'other@example.com',
      nickname: 'Other',
      password: 'other-password-123',
    });

    const response = await fetch(`${baseUrl}/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        user_id: otherUser.id,
        title: 'Forbidden push',
        body: 'Should not be delivered',
      }),
    });

    assert.equal(response.status, 403);
  });
});

describe('Dashboard API', () => {
  test('GET /dashboard/today returns aggregated data', async () => {
    const requests = [
      { status: 'normal', duration_seconds: 600 },
      { status: 'warning', duration_seconds: 120 },
      { status: 'danger', duration_seconds: 180 },
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
      { status: 'normal', duration_seconds: 300, recorded_at: isoAtDaysOffset(-2, 8, 0) },
      { status: 'danger', duration_seconds: 120, recorded_at: isoAtDaysOffset(-1, 8, 0) },
      { status: 'warning', duration_seconds: 180, recorded_at: isoAtDaysOffset(0, 8, 0) },
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

describe('Posture heartbeat API', () => {
  test('POST /posture/heartbeat starts tracking for a new status', async () => {
    const response = await fetch(`${baseUrl}/posture/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'good',
      }),
    });

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.data.status, 'good');
    assert.equal(body.data.current_duration_seconds, 0);
    assert.equal(body.data.alert.triggered, false);

    const state = await get(
      `SELECT current_status, alert_sent
       FROM PostureHeartbeatState
       WHERE user_id = ?`,
      [currentUser.id]
    );

    assert.equal(state.current_status, 'good');
    assert.equal(state.alert_sent, 0);
  });

  test('POST /posture/heartbeat logs the previous segment when status changes', async () => {
    const firstResponse = await fetch(`${baseUrl}/posture/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'good',
      }),
    });

    assert.equal(firstResponse.status, 200);

    const twelveSecondsAgo = new Date(Date.now() - 12_000).toISOString();

    await run(
      `UPDATE PostureHeartbeatState
       SET started_at = ?, last_seen_at = ?, updated_at = ?
       WHERE user_id = ?`,
      [twelveSecondsAgo, twelveSecondsAgo, twelveSecondsAgo, currentUser.id]
    );

    const response = await fetch(`${baseUrl}/posture/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'caution',
      }),
    });

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.data.status, 'caution');
    assert.ok(body.data.previous_segment);
    assert.equal(body.data.previous_segment.status, 'normal');
    assert.ok(body.data.previous_segment.duration_seconds >= 12);

    const logs = await all(
      `SELECT status, duration_seconds
       FROM PostureLogs
       WHERE user_id = ?`,
      [currentUser.id]
    );

    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, 'normal');
    assert.ok(logs[0].duration_seconds >= 12);
  });

  test('POST /posture/heartbeat triggers a single alert when bad lasts 5 seconds', async () => {
    const registerResponse = await fetch(`${baseUrl}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        device_type: 'web',
        fcm_token: 'heartbeat-alert-token',
      }),
    });

    assert.equal(registerResponse.status, 201);

    messagingService.sendEachForMulticast = async ({ tokens, notification }) => {
      assert.deepEqual(tokens, ['heartbeat-alert-token']);
      assert.equal(notification.title, 'Posture Alert');
      assert.match(notification.body, /Bad posture detected for 5 seconds/);

      return {
        successCount: 1,
        failureCount: 0,
      };
    };

    const startResponse = await fetch(`${baseUrl}/posture/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'bad',
      }),
    });

    assert.equal(startResponse.status, 200);

    const fiveSecondsAgo = new Date(Date.now() - 5_000).toISOString();

    await run(
      `UPDATE PostureHeartbeatState
       SET started_at = ?, last_seen_at = ?, updated_at = ?
       WHERE user_id = ?`,
      [fiveSecondsAgo, fiveSecondsAgo, fiveSecondsAgo, currentUser.id]
    );

    const response = await fetch(`${baseUrl}/posture/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'bad',
      }),
    });

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.ok(body.data.current_duration_seconds >= 5);
    assert.equal(body.data.alert.triggered, true);
    assert.equal(body.data.alert.push.delivered, true);

    const notifications = await all(
      `SELECT status, message
       FROM Notifications
       WHERE user_id = ?`,
      [currentUser.id]
    );

    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].status, 'danger');
    assert.match(notifications[0].message, /Bad posture detected/);

    const heartbeatState = await get(
      `SELECT alert_sent
       FROM PostureHeartbeatState
       WHERE user_id = ?`,
      [currentUser.id]
    );

    assert.equal(heartbeatState.alert_sent, 1);
  });
});
