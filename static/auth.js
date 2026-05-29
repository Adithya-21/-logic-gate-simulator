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
  if (input.type === 'password') {
    input.type = 'text';
    el.textContent = '🙈';
  } else {
    input.type = 'password';
    el.textContent = '👁';
  }
}

async function login() {
  const email    = document.getElementById('email').value.trim();
  const phone    = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !phone || !password) return showError('All fields are required');
  if (!/^\d{10}$/.test(phone)) return showError('Enter a valid 10-digit phone number');

  const res  = await fetch('/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, phone, password })
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

  const res  = await fetch('/register', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, email, phone, password, secret_answer })
  });
  const data = await res.json();
  if (data.success) {
    showSuccess('Account created! Redirecting to login...');
    setTimeout(() => window.location.href = '/login', 1500);
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

  // Clear previous errors
  document.getElementById('error-box').style.display = 'none';

  if (!username || !email || !phone || !password || !secret_answer)
    return showError('All fields are required');

  if (!/^\d{10}$/.test(phone))
    return showError('Enter a valid 10-digit phone number');

  if (password.length < 8)
    return showError('Password must be at least 8 characters');

  if (!/[A-Z]/.test(password))
    return showError('Password must contain at least one UPPERCASE letter (A-Z)');

  if (!/[a-z]/.test(password))
    return showError('Password must contain at least one lowercase letter (a-z)');

  if (!/[0-9]/.test(password))
    return showError('Password must contain at least one number (0-9)');

  if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/.test(password))
    return showError('Password must contain at least one special character e.g. !@#$%');

  const res  = await fetch('/register', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, email, phone, password, secret_answer })
  });
  const data = await res.json();
  if (data.success) {
    showSuccess('Account created! Redirecting to login...');
    setTimeout(() => window.location.href = '/login', 1500);
  } else {
    showError(data.message);
  }
}function checkPasswordStrength(pw) {
  const box = document.getElementById('pw-strength');
  box.style.display = 'block';

  const rules = [
    { test: pw.length >= 8,                          label: 'At least 8 characters'         },
    { test: /[A-Z]/.test(pw),                        label: 'One uppercase letter (A-Z)'     },
    { test: /[a-z]/.test(pw),                        label: 'One lowercase letter (a-z)'     },
    { test: /[0-9]/.test(pw),                        label: 'One number (0-9)'               },
    { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw), label: 'One special character (!@#$%)' },
  ];

  const passed = rules.filter(r => r.test).length;

  const fill   = document.getElementById('strength-fill');
  const label  = document.getElementById('strength-label');
  const rulesEl = document.getElementById('pw-rules');

  const pct    = (passed / rules.length) * 100;
  fill.style.width = pct + '%';

  if (passed <= 1)      { fill.style.background = '#f85656'; label.textContent = '🔴 Very Weak';  label.style.color = '#f85656'; }
  else if (passed === 2){ fill.style.background = '#f8a056'; label.textContent = '🟠 Weak';        label.style.color = '#f8a056'; }
  else if (passed === 3){ fill.style.background = '#f8c956'; label.textContent = '🟡 Fair';        label.style.color = '#f8c956'; }
  else if (passed === 4){ fill.style.background = '#a0c4ff'; label.textContent = '🔵 Good';        label.style.color = '#a0c4ff'; }
  else                  { fill.style.background = '#56f89c'; label.textContent = '🟢 Strong';      label.style.color = '#56f89c'; }

  rulesEl.innerHTML = rules.map(r =>
    `<div class="pw-rule ${r.test ? 'rule-pass' : 'rule-fail'}">
      ${r.test ? '✅' : '❌'} ${r.label}
    </div>`
  ).join('');
}