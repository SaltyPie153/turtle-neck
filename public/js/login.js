import { requestFcmToken } from "./firebase-messaging.js";

const loginForm = document.getElementById('loginForm');
const messageBox = document.getElementById('message');
const userBox = document.getElementById('userBox');
const logoutBtn = document.getElementById('logoutBtn');

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
  messageBox.style.display = 'block';
}

function showUserInfo(user) {
  userBox.style.display = 'block';
  logoutBtn.style.display = 'block';
  userBox.innerHTML = `
    <strong>Signed in user</strong><br>
    ID: ${user.id}<br>
    Name: ${user.username}<br>
    Email: ${user.email}<br><br>
    <a href="/camera.html">Open camera monitor</a>
  `;
}

async function registerWebDevice(jwtToken) {
  try {
    const fcmToken = await requestFcmToken();

    if (!fcmToken) {
      console.log('Skipping web device registration because no FCM token was issued.');
      return;
    }

    const response = await fetch('/devices/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        device_type: 'web',
        fcm_token: fcmToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Device registration failed:', data.message);
      return;
    }

    console.log('Web device registered.');
  } catch (error) {
    console.error('FCM registration error:', error);
  }
}

async function loadMyInfo() {
  const jwtToken = localStorage.getItem('token');
  if (!jwtToken) return;

  try {
    const response = await fetch('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return;
    }

    showMessage('Already signed in.', 'success');
    showUserInfo(data.user);

    await registerWebDevice(jwtToken);
  } catch (error) {
    console.error(error);
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.message || 'Login failed.', 'error');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showMessage('Login successful.', 'success');
    showUserInfo(data.user);

    await registerWebDevice(data.token);
  } catch (error) {
    showMessage('A server communication error occurred.', 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  alert('Signed out.');
  window.location.reload();
});

loadMyInfo();
