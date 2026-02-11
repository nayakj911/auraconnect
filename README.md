# AuraConnect Full-Stack

Fully functional AuraConnect app with Node.js + Express backend, SQLite database, and static frontend pages.

## Features
- User signup/login/logout with JWT auth (HTTP-only cookie)
- Protected dashboard/profile endpoint and page
- Contact form saves messages to SQLite
- Pricing subscribe action saves selected plan for logged-in users
- Auth-aware navbar and redirects for login/signup pages
- Success/error toast messages for main actions

## Project Structure

```
auraconnect-fullstack/
  server/
    index.js
    db.js
    initDb.js
  public/
    css/style.css
    js/app.js
    index.html
    signup.html
    login.html
    dashboard.html
    pricing.html
    contact.html
    404.html
  .env.example
  package.json
```

## Setup & Run

1. Open terminal in `auraconnect-fullstack`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create environment file:
   ```bash
   copy .env.example .env
   ```
   Then edit `.env` and set a secure `JWT_SECRET`.
4. Initialize DB/tables (includes demo seed user):
   ```bash
   npm run init-db
   ```
5. Start server:
   ```bash
   npm start
   ```
   App runs at: `http://localhost:3000`

For development with autoreload:
```bash
npm run dev
```

## Demo Seed User
- Email: `demo@auraconnect.app`
- Password: `Demo@1234`

## Key Routes
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/dashboard` (protected)
- `POST /api/contact`
- `POST /api/subscribe` (protected)
- `GET /dashboard` (page)

## Sanity Test Example (PowerShell/curl)
Use cookie jar for session:
```bash
curl -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"testuser@example.com\",\"password\":\"StrongPass123\"}"
curl -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"testuser@example.com\",\"password\":\"StrongPass123\"}"
curl -b cookies.txt http://localhost:3000/api/dashboard
curl -b cookies.txt -X POST http://localhost:3000/api/subscribe -H "Content-Type: application/json" -d "{\"plan\":\"pro\"}"
```
