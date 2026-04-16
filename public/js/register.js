const registerForm = document.getElementById('registerForm');
const messageBox = document.getElementById('message');

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
  messageBox.style.display = 'block';
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const nickname = document.getElementById('nickname').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const profileImageInput = document.getElementById('profile_image');

  if (!username || !email || !password) {
    showMessage('이름, 이메일, 비밀번호는 필수입니다.', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage('비밀번호는 6자 이상이어야 합니다.', 'error');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('nickname', nickname);
    formData.append('email', email);
    formData.append('password', password);

    if (profileImageInput.files.length > 0) {
      formData.append('profile_image', profileImageInput.files[0]);
    }

    const response = await fetch('/auth/register', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.message || '회원가입에 실패했습니다.', 'error');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showMessage('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.', 'success');

    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1200);
  } catch (error) {
    showMessage('서버와 통신 중 오류가 발생했습니다.', 'error');
  }
});