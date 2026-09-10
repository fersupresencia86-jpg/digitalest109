const form = document.getElementById('loginForm');
const errBox = document.getElementById('err');

// Si ya hay sesión activa, redirige directo.
fetch('/api/session').then(r => r.json()).then(({ user }) => {
  if (user) redirect(user);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.classList.remove('show');
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    errBox.textContent = data.error || 'No se pudo iniciar sesión';
    errBox.classList.add('show');
    return;
  }
  redirect(data.user);
});

function redirect(user) {
  window.location.href = user.role === 'admin' ? '/admin.html' : '/dashboard.html';
}
