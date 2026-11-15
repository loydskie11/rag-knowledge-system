$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path ".env.local")) {
    throw "Missing .env.local. Run the local migration setup first."
}

function Get-DotEnvValue([string]$path, [string]$name) {
    if (-not (Test-Path $path)) { return "" }
    $line = Get-Content $path | Where-Object {
        $_ -match "^\s*$([regex]::Escape($name))\s*="
    } | Select-Object -First 1
    if (-not $line) { return "" }
    return (($line -split "=", 2)[1]).Trim().Trim('"').Trim("'")
}

if (-not $env:GROQ_API_KEY) {
    $env:GROQ_API_KEY = Get-DotEnvValue "backend\.env" "GROQ_API_KEY"
}

docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml build
if ($LASTEXITCODE -ne 0) {
    throw "The local application images could not be rebuilt. An internet connection may be required to download or verify base images."
}

Write-Host "Local application images rebuilt successfully." -ForegroundColor Green
Write-Host "Run npm run local:start to start the system."
