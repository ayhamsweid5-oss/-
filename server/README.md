# Makhzani Online Backend

1. Install Node.js 20+ and PostgreSQL 14+.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
3. Run `psql "$env:DATABASE_URL" -f schema.sql` (or the equivalent command on Linux).
4. Run `npm install` inside `server`.
5. Start with `npm start`.

The API health endpoint is `GET /api/health`. Protected endpoints require `Authorization: Bearer <token>`.
The authenticated `GET /api/snapshot` endpoint returns products, transactions and contacts together for initial Web hydration.
Use a reverse proxy such as Nginx/Caddy for HTTPS in production. Schedule PostgreSQL `pg_dump` backups; never store production credentials in source control.

On Windows, run `./backup.ps1` from Task Scheduler. Restore with `pg_restore --clean --if-exists --dbname="$env:DATABASE_URL" <backup-file>` after verifying the target database.

## Docker deployment

Copy the root `.env.example` to `.env`, set strong secrets, then run `docker compose up -d --build`. Run the admin seed inside the API container with `docker compose exec api node src/seed-admin.js` after setting `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Put Caddy or Nginx in front of port 3000 and use `Caddyfile.example` to enable automatic HTTPS.
