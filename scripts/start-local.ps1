$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path ".env.local")) {
    throw "Missing .env.local. Run the local migration setup before starting the system."
}

function Get-DotEnvValue([string]$path, [string]$name) {
    if (-not (Test-Path $path)) { return "" }
    $line = Get-Content $path | Where-Object {
        $_ -match "^\s*$([regex]::Escape($name))\s*="
    } | Select-Object -First 1
    if (-not $line) { return "" }
    return (($line -split "=", 2)[1]).Trim().Trim('"').Trim("'")
}

# Preserve the hosted project as the read-only survey inbox while SUPABASE_URL
# itself is overridden with the local project inside Docker Compose.
if (-not $env:CLOUD_SURVEY_SUPABASE_URL) {
    $env:CLOUD_SURVEY_SUPABASE_URL = Get-DotEnvValue "backend\.env" "SUPABASE_URL"
}
if (-not $env:CLOUD_SURVEY_SUPABASE_SERVICE_KEY) {
    $env:CLOUD_SURVEY_SUPABASE_SERVICE_KEY = Get-DotEnvValue "backend\.env" "SUPABASE_SERVICE_KEY"
}
# Keep cloud fallback credentials server-side. Compose receives the value at
# startup, but it is never written into the frontend image or system settings.
if (-not $env:GROQ_API_KEY) {
    $env:GROQ_API_KEY = Get-DotEnvValue "backend\.env" "GROQ_API_KEY"
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    $dockerDesktop = "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
    if (-not (Test-Path $dockerDesktop)) {
        throw "Docker Desktop is not installed in the expected location."
    }
    Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
    $dockerReady = $false
    1..30 | ForEach-Object {
        docker info *> $null
        if ($LASTEXITCODE -eq 0) {
            $dockerReady = $true
            return
        }
        Start-Sleep -Seconds 2
    }
    if (-not $dockerReady) {
        throw "Docker Desktop did not become ready within 60 seconds."
    }
}

$supabaseCli = Join-Path $projectRoot "node_modules\.bin\supabase.cmd"
if (-not (Test-Path $supabaseCli)) {
    throw "The local Supabase CLI is missing. Run npm install once while online."
}

& $supabaseCli start
if ($LASTEXITCODE -ne 0) {
    throw "Local Supabase failed to start."
}

$requiredImages = @("rag-governance-backend:latest", "rag-governance-frontend:latest")
foreach ($image in $requiredImages) {
    docker image inspect $image *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Missing local image $image. Connect to the internet once and run npm run local:rebuild."
    }
}

$embeddingCacheVolume = "ctu-kms-huggingface-cache"
docker volume create $embeddingCacheVolume *> $null
$cacheReady = docker run --rm -v "${embeddingCacheVolume}:/cache" rag-governance-backend:latest `
    sh -lc "test -s /cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/refs/main"
if ($LASTEXITCODE -ne 0) {
    $hostEmbeddingCache = Join-Path $env:USERPROFILE ".cache\huggingface"
    $hostModelReference = Join-Path $hostEmbeddingCache "hub\models--sentence-transformers--all-MiniLM-L6-v2\refs\main"
    if (-not (Test-Path $hostModelReference)) {
        throw "The local embedding model cache is missing. Connect once and run npm run local:rebuild to prepare it."
    }
    Write-Host "Preparing the persistent local embedding model cache..."
    docker run --rm -v "${hostEmbeddingCache}:/source:ro" -v "${embeddingCacheVolume}:/cache" `
        rag-governance-backend:latest sh -lc "cp -a /source/. /cache/"
    if ($LASTEXITCODE -ne 0) {
        throw "The local embedding model cache could not be prepared."
    }
}

# Starting must remain fully offline. Rebuilding checks base-image metadata on
# Docker Hub, so builds are deliberately handled by `npm run local:rebuild`.
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d --no-build
if ($LASTEXITCODE -ne 0) {
    throw "The CTU KMS application containers failed to start."
}

Write-Host ""
Write-Host "CTU KMS is starting locally." -ForegroundColor Green
Write-Host "Application: http://localhost"
Write-Host "Supabase Studio: http://localhost:54323"
Write-Host "Ollama: http://localhost:11434"
