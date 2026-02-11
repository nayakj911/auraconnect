require('dotenv').config();

const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { run, get } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET in environment. Add it to .env');
  process.exit(1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: '1d'
  });
}

function authRequired(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

async function ensureTables() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
}

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters.' });
    }
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = { id: result.id, name: name.trim(), email: normalizedEmail };
    const token = signToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(201).json({ message: 'Signup successful!', user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during signup.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      message: 'Login successful!',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully.' });
});

app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Not logged in.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await get('SELECT id, name, email, created_at FROM users WHERE id = ?', [payload.id]);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }
    return res.json({ user });
  } catch {
    return res.status(401).json({ message: 'Invalid session.' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Please enter your name.' });
    }
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email.' });
    }
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ message: 'Message must be at least 10 characters.' });
    }

    await run('INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)', [
      name.trim(),
      email.trim().toLowerCase(),
      message.trim()
    ]);

    return res.status(201).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not send message.' });
  }
});

app.post('/api/subscribe', authRequired, async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ['starter', 'pro', 'enterprise'];

    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan selected.' });
    }

    await run(
      `INSERT INTO subscriptions (user_id, plan) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, created_at = CURRENT_TIMESTAMP`,
      [req.user.id, plan]
    );

    return res.json({ message: `Subscription updated to ${plan}.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not update subscription.' });
  }
});

app.get('/api/dashboard', authRequired, async (req, res) => {
  const subscription = await get('SELECT plan, created_at FROM subscriptions WHERE user_id = ?', [
    req.user.id
  ]);
  return res.json({
    message: 'Dashboard data fetched.',
    user: req.user,
    subscription: subscription || null
  });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'));
});

ensureTables()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`AuraConnect running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize DB tables:', err.message);
    process.exit(1);
  });
