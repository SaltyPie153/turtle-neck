const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function normalizePrivateKey(privateKey) {
  if (typeof privateKey !== 'string') {
    return privateKey;
  }

  return privateKey.replace(/\\n/g, '\n');
}

function parseServiceAccountFromEnv() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!rawJson) {
    return null;
  }

  const parsed = JSON.parse(rawJson);

  if (parsed.private_key) {
    parsed.private_key = normalizePrivateKey(parsed.private_key);
  }

  return parsed;
}

function readServiceAccountFromFile() {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');

  if (!fs.existsSync(serviceAccountPath)) {
    return null;
  }

  const parsed = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  if (parsed.private_key) {
    parsed.private_key = normalizePrivateKey(parsed.private_key);
  }

  return parsed;
}

function getServiceAccount() {
  const fromEnv = parseServiceAccountFromEnv();

  if (fromEnv) {
    return fromEnv;
  }

  const fromFile = readServiceAccountFromFile();

  if (fromFile) {
    return fromFile;
  }

  return null;
}

function ensureFirebaseApp() {
  if (admin.apps.length) {
    return true;
  }

  const serviceAccount = getServiceAccount();

  if (!serviceAccount) {
    return false;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return true;
}

const fallbackMessaging = {
  async sendEachForMulticast() {
    throw new Error(
      'Firebase service account is required. Set FIREBASE_SERVICE_ACCOUNT_JSON or provide serviceAccountKey.json.'
    );
  },
};

module.exports = {
  get apps() {
    return admin.apps;
  },
  messaging() {
    if (ensureFirebaseApp()) {
      return admin.messaging();
    }

    return fallbackMessaging;
  },
};
