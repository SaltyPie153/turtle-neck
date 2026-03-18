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
    <strong>로그인된 사용자</strong><br>
    ID: ${user.id}<br>
    이름: ${user.username}<br>
    이메일: ${user.email}
  `;
}

async function loadMyInfo() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return;
    }

    showMessage('이미 로그인되어 있습니다.', 'success');
    showUserInfo(data.user);
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
      showMessage(data.message || '로그인에 실패했습니다.', 'error');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showMessage('로그인 성공', 'success');
    showUserInfo(data.user);
  } catch (error) {
    showMessage('서버와 통신 중 오류가 발생했습니다.', 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  alert('로그아웃되었습니다.');
  window.location.reload();
});

loadMyInfo();