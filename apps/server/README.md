# IronClad in-memory API

This is the active backend workspace for the approved frontend in `apps/web/Frontend`. It uses Express and a process-local repository; it does not connect to PostgreSQL, Redis, an ORM, migrations, or `packages/database`.

## Run

From the repository root:

```powershell
npm install
npm run dev:backend
npm run dev:frontend
```

The API listens at `http://localhost:3000/api`. During Vite development, the frontend uses the same-origin `/backend` path, which Vite proxies to `http://127.0.0.1:3000`. This also allows an HTTPS development tunnel to reach the local API without mixed-content errors.

In non-production environments, `POST /api/test/reset` restores the exact 13 test accounts and all default demo content. Resetting also revokes every active session. Configure `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `apps/server/.env` to deliver one-time verification codes through Gmail. When mail credentials are intentionally absent, local development and automated tests use the mock code `123456`.

All runtime data disappears when the Node process restarts. The repository boundary is `src/repositories/InMemoryPortalRepository.js`; route handlers and workflow services do not import a database package.

See [DATA_CONTRACTS.md](./DATA_CONTRACTS.md) for the repository and HTTP payload shapes.
