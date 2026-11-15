$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml down
$supabaseCli = Join-Path $projectRoot "node_modules\.bin\supabase.cmd"
if (-not (Test-Path $supabaseCli)) {
    throw "The local Supabase CLI is missing. Run npm install once while online."
}
& $supabaseCli stop

Write-Host "CTU KMS and local Supabase have stopped. Local data was preserved." -ForegroundColor Green
