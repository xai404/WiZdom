# WiZdom

A learning platform with three parts that share one backend and one MongoDB database:

- **backend** — Node.js + Express + MongoDB (Mongoose) REST API, JWT authentication
- **admin** — React + Vite + TypeScript + Tailwind CSS website for administrators
- **app** — React Native (Expo) + TypeScript + NativeWind mobile app for students

Current scope: authentication (login) end to end, an admin dashboard shell, and a student
home screen. Student management, profile, progress, chat, notifications, and settings are
intentionally not built yet.

## Project structure

```
WiZdom/
├── backend/     Express API (config, controllers, middleware, models, routes, services, utils)
├── admin/       Admin website (React + Vite + TS + Tailwind)
├── app/         Student mobile app (Expo + TS + NativeWind)
├── uploads/     Local placeholder for documents (will move to a VPS later)
├── README.md
└── .gitignore
```

## Prerequisites

- Node.js 18+
- A running MongoDB instance (local `mongod` or a connection string to Atlas/etc.)
- For the mobile app: the Expo Go app on your phone, or an Android/iOS simulator

## Quick start (all three at once)

Once each part has its `.env` set up and dependencies installed (`npm run install:all` from the
repo root installs backend, admin, and app in one go), start everything with a single command
from the repo root:

```bash
npm run dev
```

This uses `concurrently` to run the backend (`nodemon`), the admin site (`vite`), and the Expo
app together in one terminal, each with a colored, labeled output prefix. Use `npm run dev:backend`,
`npm run dev:admin`, or `npm run dev:app` to run just one of them.

## 1. Backend

```bash
cd backend
cp .env.example .env   # edit MONGO_URI / JWT_SECRET / SEED_ADMIN_* as needed
npm install
npm run seed:admin      # creates the first admin account from SEED_ADMIN_* env vars
npm run dev              # http://localhost:5000
```

API surface so far:

| Method | Route                | Access        | Description                          |
| ------ | --------------------- | ------------- | ------------------------------------- |
| POST   | `/api/auth/login`     | Public        | Login as admin or student, returns JWT |
| GET    | `/api/auth/me`        | Private       | Returns the authenticated user        |
| GET    | `/api/dashboard/stats`| Private/Admin | Total & active student counts         |
| GET    | `/api/health`         | Public        | Health check                          |

Admins and students live in separate Mongoose collections (`Admin`, `Student`) but share the
same login endpoint — the server tries each collection and issues a JWT with a `role` claim.

## 2. Admin website

```bash
cd admin
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:5000/api
npm install
npm run dev              # http://localhost:5173
```

Log in with the admin account created by `npm run seed:admin` in the backend. The dashboard
shows Total Students / Active Students pulled from `/api/dashboard/stats`.

## 3. Student mobile app

```bash
cd app
cp .env.example .env   # EXPO_PUBLIC_API_URL
npm install
npm start
```

Then press `w` for web, `a` for Android, `i` for iOS (macOS only), or scan the QR code with
Expo Go. Update `EXPO_PUBLIC_API_URL` in `.env` to match how the device reaches your backend:

- Web / iOS simulator: `http://localhost:5000/api`
- Android emulator: `http://10.0.2.2:5000/api`
- Physical device: `http://<your-computer-LAN-IP>:5000/api`

Since student accounts aren't self-serve yet, create one manually (an admin-facing "create
student" flow is future scope) — for example from the `backend` folder:

```bash
node -e "require('dotenv').config(); const mongoose=require('mongoose'); const Student=require('./models/Student'); mongoose.connect(process.env.MONGO_URI).then(async()=>{await Student.create({name:'Test Student', email:'student@wizdom.com', password:'Student123!'}); process.exit(0);});"
```

## Authentication flow

1. An admin creates a student account (manual for now — see above).
2. The student logs into the Expo app with that email/password.
3. The backend verifies credentials with bcrypt and issues a JWT (`{ id, role }`).
4. The app stores the JWT (in memory always; in `AsyncStorage` too if "Remember me" is on)
   and sends it as `Authorization: Bearer <token>` on subsequent requests.
5. `GET /api/auth/me` is used to restore the session on app/website reload.

## Tech stack

- **Backend**: Express, Mongoose, bcryptjs, jsonwebtoken, express-validator, helmet, cors, morgan
- **Admin**: React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Axios, lucide-react
- **App**: Expo (React Native 0.86, React 19), TypeScript, NativeWind (Tailwind v3), Axios,
  `@react-native-async-storage/async-storage`, `lucide-react-native`

## Notes

- Documents/files are not stored in MongoDB — the `uploads/` folder is a placeholder until a
  VPS-backed file storage service is wired up.
- `.env` files are git-ignored; `.env.example` files document the required variables for each
  part of the project.
