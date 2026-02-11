const bcrypt = require('bcrypt');
const { run, get, dbPath } = require('./db');

async function init() {
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

  const demoEmail = 'demo@auraconnect.app';
  const existing = await get('SELECT id FROM users WHERE email = ?', [demoEmail]);

  if (!existing) {
    const hash = await bcrypt.hash('Demo@1234', 10);
    await run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [
      'Demo User',
      demoEmail,
      hash
    ]);
    console.log('Seeded demo user: demo@auraconnect.app / Demo@1234');
  } else {
    console.log('Demo user already exists.');
  }

  console.log(`Database initialized at: ${dbPath}`);
  process.exit(0);
}

init().catch((err) => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
