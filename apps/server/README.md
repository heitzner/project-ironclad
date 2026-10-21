# IronClad in-memory API

This is the active backend workspace for the approved frontend in `apps/web/Frontend`. It uses Express and a process-local repository; it does not connect to PostgreSQL, Redis, an ORM, migrations, or `packages/database`.

## Run

From the repository root:

```powershell
npm install
npm run dev:backend
npm run dev:frontend
```

The API listens at `http://localhost:3000/api`. The frontend development environment is configured with `VITE_API_URL=http://localhost:3000`.

In non-production environments, `POST /api/test/reset` restores the exact 13 test accounts and all default demo content. Resetting also revokes every active session. The mock email verification code is `123456`.

All runtime data disappears when the Node process restarts. The repository boundary is `src/repositories/InMemoryPortalRepository.js`; route handlers and workflow services do not import a database package.

See [DATA_CONTRACTS.md](./DATA_CONTRACTS.md) for the repository and HTTP payload shapes.
