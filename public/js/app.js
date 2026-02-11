async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  let data = {};
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

function toast(message, type = 'success') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }

  el.textContent = message;
  el.className = `toast ${type} show`;
  setTimeout(() => { el.classList.remove('show'); }, 2500);
}

async function getCurrentUser() {
  try {
    const data = await api('/api/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

function setNav(user) {
  const loggedOut = document.querySelectorAll('[data-auth="out"]');
  const loggedIn = document.querySelectorAll('[data-auth="in"]');
  loggedOut.forEach((el) => el.classList.toggle('hidden', !!user));
  loggedIn.forEach((el) => el.classList.toggle('hidden', !user));
}

async function bootNav() {
  const user = await getCurrentUser();
  setNav(user);

  const logoutBtns = document.querySelectorAll('[data-logout]');
  logoutBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await api('/api/auth/logout', { method: 'POST' });
        toast('Logged out successfully', 'success');
        setTimeout(() => (window.location.href = '/'), 400);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });

  return user;
}

window.Aura = { api, toast, getCurrentUser, bootNav };
