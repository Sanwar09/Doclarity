$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverEnv = Join-Path $root 'server\.env'
$composeFile = Join-Path $root 'docker-compose.prod.yml'

if (-not (Test-Path $serverEnv)) {
  Write-Host "Missing server/.env" -ForegroundColor Red
  Write-Host "Create it from server/.env.production.example before deploying." -ForegroundColor Yellow
  exit 1
}

Write-Host "Validating Docker Compose config..." -ForegroundColor Cyan
docker compose -f $composeFile config | Out-Null

Write-Host "Building and starting production containers..." -ForegroundColor Cyan
docker compose -f $composeFile up --build -d

Write-Host "Deployment command completed." -ForegroundColor Green
Write-Host "Open: http://YOUR_SERVER_IP" -ForegroundColor Green
