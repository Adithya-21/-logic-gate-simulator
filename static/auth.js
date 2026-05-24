function showError(msg) {
  const box = document.getElementById('error-box');
  box.textContent = msg;
  box.style.display = 'block';
}

function showSuccess(msg) {
  const box = document.getElementById('success-box');
  box.textContent = msg;
  box.style.display = 'block';
}

function togglePassword(id, el) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
  el.textContent = input.type === 'password' ? '👁' : '🙈';
}

async function login() {
  const email    = document.getElementById('email').value.trim();
  const phone    = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !phone || !password) return showError('All fields are required');
  if (!/^\d{10}$/.test(phone)) return showError('Enter a valid 10-digit phone number');

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone, password })
  });
  const data = await res.json();
  if (data.success) {
    window.location.href = '/';
  } else {
    showError(data.message);
  }
}

async function register() {
  const username      = document.getElementById('username').value.trim();
  const email         = document.getElementById('email').value.trim();
  const phone         = document.getElementById('phone').value.trim();
  const password      = document.getElementById('password').value;
  const secret_answer = document.getElementById('secret_answer').value.trim();

  if (!username || !email || !phone || !password || !secret_answer)
    return showError('All fields are required');
  if (!/^\d{10}$/.test(phone))
    return showError('Enter a valid 10-digit phone number');
  if (password.length < 6)
    return showError('Password must be at least 6 characters');

  const res = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, phone, password, secret_answer })
  });
  const data = await res.json();
  if (data.success) {
    showSuccess('Account created! Redirecting to login...');
    setTimeout(() => window.location.href = '/login', 1500);
  } else {
    showError(data.message);
  }
}

async function forgotPassword() {
  const email         = document.getElementById('email').value.trim();
  const secret_answer = document.getElementById('secret_answer').value.trim();
  const new_password  = document.getElementById('new_password').value;

  if (!email || !secret_answer || !new_password)
    return showError('All fields are required');
  if (new_password.length < 6)
    return showError('Password must be at least 6 characters');

  const res = await fetch('/forgot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, secret_answer, new_password })
  });
  const data = await res.json();
  if (data.success) {
    showSuccess('Password reset! Redirecting to login...');
    setTimeout(() => window.location.href = '/login', 1500);
  } else {
    showError(data.message);
  }
}