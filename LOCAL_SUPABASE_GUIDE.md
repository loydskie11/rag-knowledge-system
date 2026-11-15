# Local Supabase Operation Guide

The CTU Knowledge Management System now runs its database, authentication data,
vector store, and document storage on the same computer as the application.
Ollama remains the local AI service. The hosted Supabase project is not required
while this local stack is running.

## Start the system

1. Open Docker Desktop and Ollama.
2. Open PowerShell in this project folder.
3. Run `npm run local:start`.
4. Open `http://localhost`.

Normal startup reuses the locally installed CLI and existing Docker images, so
it does not require an internet connection. After changing application code or
Docker dependencies, run `npm run local:rebuild` while online, then start again.
The sentence-embedding model is copied once into a persistent Docker volume and
is forced into offline mode on every normal start.

Survey responses use one-way synchronization. The deployed survey continues to
write to the hosted Supabase project, while the local backend reads new cloud
responses and stores them locally. Local responses and other institutional data
are never pushed to the hosted project. The hosted survey URL and service key
remain private backend settings in `backend/.env`.

Supabase Studio is available at `http://localhost:54323` for local database
inspection. Other devices should use the application URL, not Studio or the
Supabase API directly.

## Stop the system

Run `npm run local:stop`. The containers stop, but the database and uploaded
files remain in Docker volumes and are available on the next start.

## Create a backup

Run `npm run local:backup` while the local stack is running. A timestamped folder
is created under `backups/` containing database dumps and a compressed copy of
all local Storage files. The `backups/` directory is intentionally excluded from
Git because it can contain private institutional data.

Keep at least one backup on a separate encrypted drive before demonstrations or
schema changes. Docker volumes are persistent, but they are not a substitute for
an independent backup.

## Local addresses

- Application: `http://localhost`
- Supabase API: `http://127.0.0.1:54321`
- PostgreSQL: `127.0.0.1:54322`
- Supabase Studio: `http://127.0.0.1:54323`
- Ollama: `http://127.0.0.1:11434`

## Current migration status

- 39 public database tables restored.
- 144 document chunks and embeddings restored.
- 120 private Storage objects restored (69,943,094 bytes).
- Application API, local database, vector retrieval, and private file download
  verified locally.
- Hosted Supabase data was left unchanged as a rollback copy.

## Before giving the system to another computer

The receiving computer needs Docker Desktop, Node.js, Ollama, the required
Ollama model, this repository, the local environment file, and a restored local
backup. Do not publish `.env.local`, service-role keys, database dumps, or private
Storage files to Git.

For campus deployment, expose only the application port through the campus
network. Replace the default local development secrets and apply firewall rules
before treating the laptop or campus computer as a production server.
