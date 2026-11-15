$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDirectory = Join-Path $projectRoot "backups\local-$timestamp"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

Write-Host "Backing up the local database..."
npx supabase db dump --role-only --file (Join-Path $backupDirectory "roles.sql")
npx supabase db dump --schema public,storage --file (Join-Path $backupDirectory "schema.sql")
npx supabase db dump --data-only --schema public,storage --use-copy --file (Join-Path $backupDirectory "data.sql")

$storageContainer = "supabase_storage_rag-governance"
$containerArchive = "/tmp/ctu-kms-storage-$timestamp.tar.gz"
$hostArchive = Join-Path $backupDirectory "storage-files.tar.gz"

Write-Host "Backing up locally stored files..."
docker exec $storageContainer tar -czf $containerArchive -C /mnt .
if ($LASTEXITCODE -ne 0) {
    throw "Could not archive local Supabase Storage."
}
docker cp "${storageContainer}:${containerArchive}" $hostArchive
if ($LASTEXITCODE -ne 0) {
    throw "Could not copy the Storage archive to the backup folder."
}
docker exec $storageContainer rm -f $containerArchive

Write-Host "Backup completed: $backupDirectory" -ForegroundColor Green
