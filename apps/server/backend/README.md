# IronClad News Feed API

In-memory Express service for the student News Feed. It intentionally does not use PostgreSQL or Redis yet; the repository layer can be replaced when the database manager supplies the database integration.

## Run

```powershell
npm install
npm run dev
```

The service listens on `http://localhost:3000` by default.

## Endpoints

- `GET /health`
- `GET /news-feed?q=&category=&limit=&offset=`
- `GET /news-feed/:postId`

All seeded records are marked with `is_demo: true` and `dataset_label: "Demo week"`.
