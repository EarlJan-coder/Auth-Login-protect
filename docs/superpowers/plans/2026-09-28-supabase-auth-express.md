# Supabase Auth Practice (Express) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 6-stage Express + Supabase authentication API — signup, login, verified JWT protection via reusable middleware, logout, Swagger UI docs — and publish it to GitHub with zero secrets.

**Architecture:** A single Express app mounts three route modules (`auth`, `public`, `protected`) behind one shared Supabase client. Token verification lives in one `requireAuth` middleware reused by every protected route. An OpenAPI 3.0 doc with a `bearerAuth` security scheme is served by swagger-ui-express at `/docs`.

**Tech Stack:** Node 22 (ESM), Express 4, `@supabase/supabase-js` v2, `dotenv`, `swagger-ui-express`, curl checkpoints, git + GitHub (`gh` already authenticated as EarlJan-coder).

## Global Constraints

- Project root: `D:\week 4` (empty; `git init` here). GitHub remote: `https://github.com/EarlJan-coder/Auth-Login-protect.git` (exists — inspect before pushing; force-push allowed only if it holds just the placeholder README).
- Port **3000**; never use the `service_role` key — anon key only.
- `.env` is git-ignored and never committed; `.env.example` carries placeholders only.
- Commit messages are exact (from spec): `Stage 0: setup server and supabase client`, `Stage 1: signup and login routes working`, `Stage 2: public route and unverified protected route`, `Stage 3: profile route token verification`, `Stage 4: auth middleware and logout endpoint`, `Stage 5: Swagger UI documentation with bearer auth`, `Stage 6: publish to GitHub and write README — then push everything`.
- User already has Supabase credentials; manual pre-check: Authentication → Sign In / Providers → Email → **Confirm email = OFF**.
- Verification = the spec's curl checkpoints (exact status codes asserted). Express JSON body parser on all routes.

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | deps, `npm start`/`npm run dev`, `"type": "module"` |
| `.gitignore` | `node_modules/`, `.env` |
| `.env` / `.env.example` | secrets (local) / placeholders (committed, Stage 6) |
| `src/config.js` | `import 'dotenv/config'`, export + validate env, `PORT` |
| `src/supabase.js` | shared Supabase client |
| `src/server.js` | app wiring: json parser, routes, swagger, listen |
| `src/middleware/requireAuth.js` | reusable Bearer-token guard (Stage 4) |
| `src/routes/auth.js` | `/signup`, `/login` (Stage 1), `/logout` (Stage 4) |
| `src/routes/public.js` | `GET /public/info` (Stage 2) |
| `src/routes/protected.js` | `GET /protected/profile` (Stages 2–4), `GET /protected/dashboard` (Stage 4) |
| `src/openapi.js` | OpenAPI 3.0 spec + `securitySchemes` (Stage 5) |
| `README.md` | Stage 6 docs + API table + Swagger screenshot |

Import order guarantee: `config.js` runs `dotenv` first and is imported by `supabase.js`/`server.js` before any env read, so secrets are always loaded before the client is created.

---

### Task 0: Stage 0 — Setup server & Supabase client

**Files:** Create `package.json`, `.gitignore`, `.env`, `src/config.js`, `src/supabase.js`, `src/server.js`

**Interfaces:**
- Produces: `config.js` exports `PORT` (number, default 3000); `supabase.js` default-exports the client; server listens on `PORT`.

- [ ] **Step 1: Scaffold and install**

```powershell
git init -b main
npm init -y
npm install express @supabase/supabase-js dotenv swagger-ui-express
```

Edit `package.json` → add `"type": "module"`, `"main": "src/server.js"`, scripts: `"start": "node src/server.js"`, `"dev": "node --watch src/server.js"`.

- [ ] **Step 2: `.gitignore` and `.env`**

```
# .gitignore
node_modules/
.env
```

```
# .env  (paste YOUR real values)
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_KEY=YOUR_ANON_KEY
PORT=3000
```

- [ ] **Step 3: Write `src/config.js`**

```js
import 'dotenv/config';

export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_KEY = process.env.SUPABASE_KEY;
export const PORT = Number(process.env.PORT) || 3000;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY — check your .env file');
  process.exit(1);
}
```

- [ ] **Step 4: Write `src/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export default supabase;
```

- [ ] **Step 5: Write `src/server.js`**

```js
import express from 'express';
import { PORT, SUPABASE_URL, SUPABASE_KEY } from './config.js';

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'Auth Practice API' }));

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_KEY },
    });
    console.log(response.ok ? 'Connected to Supabase' : 'Supabase health check failed');
  } catch {
    console.log('Could not reach Supabase — check SUPABASE_URL');
  }
});
```

- [ ] **Step 6: Checkpoint — run server**

Run: `npm start` → Expected: `Server running on port 3000` + `Connected to Supabase`, no errors. Verify `git status` never lists `.env`. Leave server running or restart later with `npm run dev`.

- [ ] **Step 7: Commit**

```powershell
git add .gitignore package.json package-lock.json src/
git commit -m "Stage 0: setup server and supabase client"
```

---

### Task 1: Stage 1 — Sign Up & Log In

**Files:** Create `src/routes/auth.js`; Modify `src/server.js`

**Interfaces:**
- Produces: `POST /auth/signup` (201 `{...user}` / 400), `POST /auth/login` (200 `{access_token, refresh_token}` / 400 / 401). Auth router default-exports an Express `Router`.

- [ ] **Step 1: Write `src/routes/auth.js`**

```js
import { Router } from 'express';
import supabase from '../supabase.js';

const router = Router();

router.post('/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data.user);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Invalid login credentials' });
  return res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

export default router;
```

- [ ] **Step 2: Mount it in `src/server.js`** (add after the `/` route)

```js
import authRoutes from './routes/auth.js';
app.use('/auth', authRoutes);
```

- [ ] **Step 3: Checkpoint — signup then login**

```powershell
curl -i -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'
# Expected: HTTP 201 with a user object (id, email)

curl -i -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"test@example.com"}'
# Expected: HTTP 400 with {"error": ...}

curl -i -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'
# Expected: HTTP 200 containing "access_token" (string)

curl -i -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"wrong"}'
# Expected: HTTP 401 {"error":"Invalid login credentials"}
```

Save the `access_token` from the login response — Stages 3–5 reuse it.

- [ ] **Step 4: Commit**

```powershell
git add src/
git commit -m "Stage 1: signup and login routes working"
```

---

### Task 2: Stage 2 — Public & Protected Gates (no verification yet)

**Files:** Create `src/routes/public.js`, `src/routes/protected.js`; Modify `src/server.js`

**Interfaces:**
- Consumes: none.
- Produces: `GET /public/info` → 200 `{ "message": "Welcome stranger! This info is public." }`; `GET /protected/profile` → 401 `{"error":"Access token required"}` without Bearer header, 200 placeholder otherwise. Both routers default-export Express `Router`s.

- [ ] **Step 1: Write `src/routes/public.js`**

```js
import { Router } from 'express';

const router = Router();

router.get('/info', (req, res) => {
  res.status(200).json({ message: 'Welcome stranger! This info is public.' });
});

export default router;
```

- [ ] **Step 2: Write `src/routes/protected.js` (presence check only)**

```js
import { Router } from 'express';

const router = Router();

router.get('/profile', (req, res) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  // Stage 3 adds real verification here
  res.status(200).json({ message: 'Token presented (not yet verified)' });
});

export default router;
```

- [ ] **Step 3: Mount both in `src/server.js`**

```js
import publicRoutes from './routes/public.js';
import protectedRoutes from './routes/protected.js';
app.use('/public', publicRoutes);
app.use('/protected', protectedRoutes);
```

- [ ] **Step 4: Checkpoint**

```powershell
curl -i http://localhost:3000/public/info          # -> 200 + welcome JSON
curl -i http://localhost:3000/protected/profile    # -> 401 {"error":"Access token required"}
curl -i http://localhost:3000/protected/profile -H "Authorization: Bearer faketoken"
# -> 200 (presence only; verification comes next stage)
```

- [ ] **Step 5: Commit**

```powershell
git add src/
git commit -m "Stage 2: public route and unverified protected route"
```

---

### Task 3: Stage 3 — Token Verification on `/protected/profile`

**Files:** Modify `src/routes/protected.js`

**Interfaces:**
- Consumes: `supabase.auth.getUser(token)` → `{ data: { user }, error }`.
- Produces: `GET /protected/profile` → 401 `{"error":"Access token required"}` (no/malformed header), 401 `{"error":"Invalid or expired token"}` (bad token), 200 `{ id, email, created_at }` (valid token).

- [ ] **Step 1: Replace the route body**

```js
import { Router } from 'express';
import supabase from '../supabase.js';

const router = Router();

router.get('/profile', async (req, res) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.status(200).json({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  });
});

export default router;
```

- [ ] **Step 2: Checkpoint — real token passes, forged token fails**

```powershell
# (token from your Stage 1 login)
curl -i http://localhost:3000/protected/profile -H "Authorization: Bearer PASTE_YOUR_ACCESS_TOKEN_HERE"
# -> 200 with id, email, created_at

# corrupt one character of the token, rerun -> 401 {"error":"Invalid or expired token"}
```

- [ ] **Step 3: Commit**

```powershell
git add src/
git commit -m "Stage 3: profile route token verification"
```

---

### Task 4: Stage 4 — Auth Middleware & Logout

**Files:** Create `src/middleware/requireAuth.js`; Modify `src/routes/protected.js`, `src/routes/auth.js`

**Interfaces:**
- Produces: `requireAuth(req, res, next)` — on success sets `req.user` (Supabase `User`) and `req.accessToken` (string), then `next()`; on failure responds 401 itself. Applied to `GET /protected/profile`, `GET /protected/dashboard`, `POST /auth/logout`.

- [ ] **Step 1: Create `src/middleware/requireAuth.js`**

```js
import supabase from '../supabase.js';

export default async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  req.accessToken = token;
  next();
}
```

- [ ] **Step 2: Slim down `src/routes/protected.js` and add the dashboard**

```js
import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

router.get('/profile', requireAuth, (req, res) => {
  const { id, email, created_at } = req.user;
  res.status(200).json({ id, email, created_at });
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.status(200).json({
    message: `Welcome back, ${req.user.email}`,
    user: { id: req.user.id, email: req.user.email },
  });
});

export default router;
```

- [ ] **Step 3: Add logout to `src/routes/auth.js`** (append; add the import)

```js
import requireAuth from '../middleware/requireAuth.js';

router.post('/logout', requireAuth, async (req, res) => {
  // supabase.auth.signOut() acts on a *stored* session; this server-side client
  // holds none, so we invoke the same /auth/v1/logout endpoint it calls, but
  // with the caller's token so THEIR session is actually revoked.
  try {
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: `Bearer ${req.accessToken}`,
      },
    });
  } catch {
    // Supabase unreachable — local logout still succeeds
  }
  res.status(204).send();
});
```

- [ ] **Step 4: Checkpoint — middleware reuse**

```powershell
curl -i http://localhost:3000/protected/profile            # -> 401 (no token)
curl -i http://localhost:3000/protected/profile -H "Authorization: Bearer BADTOKEN"   # -> 401 invalid
curl -i http://localhost:3000/protected/profile -H "Authorization: Bearer REAL_TOKEN" # -> 200

# NEW route — zero new auth code written:
curl -i http://localhost:3000/protected/dashboard -H "Authorization: Bearer REAL_TOKEN"  # -> 200
curl -i http://localhost:3000/protected/dashboard                                       # -> 401

curl -i -X POST http://localhost:3000/auth/logout -H "Authorization: Bearer REAL_TOKEN"  # -> 204
curl -i -X POST http://localhost:3000/auth/logout                                        # -> 401
```

Log in again after logout (the revoked session's refresh token is dead) before Stage 5.

- [ ] **Step 5: Commit**

```powershell
git add src/
git commit -m "Stage 4: auth middleware and logout endpoint"
```

---

### Task 5: Stage 5 — Swagger UI with Bearer Authorize

**Files:** Create `src/openapi.js`; Modify `src/server.js`

**Interfaces:**
- Produces: `GET /docs` (Swagger UI), spec with `components.securitySchemes.bearerAuth` (`type: http, scheme: bearer, bearerFormat: JWT`); `/auth/logout`, `/protected/profile`, `/protected/dashboard` declare `security: [{ bearerAuth: [] }]`.

- [ ] **Step 1: Write `src/openapi.js`**

```js
export const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Auth Practice API',
    version: '1.0.0',
    description: 'Express + Supabase authentication: signup, login, logout, and middleware-protected routes.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: { 201: { description: 'User created' }, 400: { description: 'Bad Request' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in and receive tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Returns access_token and refresh_token' },
          400: { description: 'Bad Request' },
          401: { description: 'Invalid login credentials' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke the current session',
        security: [{ bearerAuth: [] }],
        responses: { 204: { description: 'No Content' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/public/info': {
      get: {
        tags: ['Public'],
        summary: 'Public info (no auth)',
        responses: { 200: { description: 'Welcome message' } },
      },
    },
    '/protected/profile': {
      get: {
        tags: ['Protected'],
        summary: 'Current user profile (requires Bearer token)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'id, email, created_at' },
          401: { description: 'Access token required / Invalid or expired token' },
        },
      },
    },
    '/protected/dashboard': {
      get: {
        tags: ['Protected'],
        summary: 'Dashboard (requires Bearer token)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Welcome-back payload' },
          401: { description: 'Unauthorized' },
        },
      },
    },
  },
};
```

- [ ] **Step 2: Serve it in `src/server.js`** (imports at top, mount after route mounts)

```js
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './openapi.js';

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
```

- [ ] **Step 3: Checkpoint — browser, no curl**

1. Open `http://localhost:3000/docs`.
2. Lock icons must appear on `/auth/logout`, `/protected/profile`, `/protected/dashboard` (not on public/signup/login).
3. Click **Authorize**, paste a fresh `access_token`, close.
4. Expand `GET /protected/profile` → **Try it out** → **Execute** → 200 with your user JSON.
5. Screenshot the authorized `/docs` page to `docs/swagger.png` for the README (manual in browser is fine).

- [ ] **Step 4: Commit**

```powershell
git add src/ docs/
git commit -m "Stage 5: Swagger UI documentation with bearer auth"
```

---

### Task 6: Stage 6 — Publish to GitHub + README

**Files:** Create `.env.example`, `README.md`; Modify `.gitignore` (verify only)

**Interfaces:** Consumes: all prior stages. Produces: public repo `Auth-Login-protect` containing the 6 stage commits, no secrets.

- [ ] **Step 1: Create `.env.example`**

```
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_anon_key
PORT=3000
```

- [ ] **Step 2: Verify zero secrets will ship**

```powershell
git check-ignore .env            # must print ".env" (ignored)
git ls-files | Select-String "\.env$"   # must print NOTHING (only .env.example allowed)
git log --all --full-history -- .env     # must be empty (never committed)
```

- [ ] **Step 3: Write `README.md`**

Sections: **project name + one-paragraph description** (Express API demonstrating Supabase auth: signup/login/logout, JWT verification, reusable middleware, Swagger docs) · **Setup** (`git clone` → `cp .env.example .env` → fill real values → `npm install`) · **Run** (one command: `npm start`, then open `http://localhost:3000/docs`) · **API reference table:**

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/auth/signup` | POST | No | Register with email + password |
| `/auth/login` | POST | No | Returns `access_token` + `refresh_token` |
| `/auth/logout` | POST | Bearer | Revokes the current session → 204 |
| `/public/info` | GET | No | Public welcome message |
| `/protected/profile` | GET | Bearer | Returns id, email, created_at |
| `/protected/dashboard` | GET | Bearer | Welcome-back payload |

· **Swagger screenshot**: `![Swagger UI](docs/swagger.png)` · **note** that email confirmation is disabled for this practice project and must be enabled in production.

- [ ] **Step 4: Push to the existing remote**

```powershell
git remote add origin https://github.com/EarlJan-coder/Auth-Login-protect.git
git ls-remote origin    # inspect: does remote main have commits?
```

- If remote is empty → `git push -u origin main`.
- If remote holds only GitHub's placeholder README (expected, given the user's pasted quick-start) → `git push -u origin main --force` (our history is the deliverable).
- If it has real commits → `git fetch origin; git rebase origin/main`, resolve (ours wins on README.md), then push.

- [ ] **Step 5: Final checkpoint — peer clone test**

```powershell
git log --oneline     # must show all 7 commits (Stage 0..6)
cd $env:TEMP; git clone https://github.com/EarlJan-coder/Auth-Login-protect.git peer-test
Select-String -Path peer-test\.gitignore -Pattern "^\.env$"   # found
Test-Path peer-test\.env    # False — no secrets in repo
```

Peer drops their own values into `.env`, runs `npm install; npm start`, hits `/docs` — under 5 minutes.

- [ ] **Step 6: Commit (Stage 6) then push everything**

```powershell
git add .env.example README.md docs/
git commit -m "Stage 6: publish to GitHub and write README — then push everything"
git push -u origin main
```
