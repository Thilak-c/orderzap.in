<# 
  ================================================
  OrderZap v2 -- Full Backend Launcher
  ================================================
  
  This script starts the entire backend stack:
    1. PostgreSQL  (assumes already running locally)
    2. Convex Backend + Dashboard (Docker containers)
    3. Express API Gateway (Node.js)
  
  Usage:  .\start.ps1
  Stop:   Ctrl+C (gracefully shuts down Express + Docker)
#>

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot

# -- Colors -----------------------------------------------
function Write-Step($msg)    { Write-Host "  > $msg" -ForegroundColor Cyan }
function Write-Ok($msg)      { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Fail($msg)    { Write-Host "  [FAIL] $msg" -ForegroundColor Red }

# -- Banner -----------------------------------------------
Write-Host ""
Write-Host "  ================================================" -ForegroundColor Magenta
Write-Host "    OrderZap v2 -- Backend Launcher"                -ForegroundColor White
Write-Host "  ================================================" -ForegroundColor Magenta
Write-Host ""

# -- Step 1: Check Prerequisites -------------------------
Write-Step "Checking prerequisites..."

# Check Docker
try {
    $null = docker --version 2>&1
    Write-Ok "Docker found"
} catch {
    Write-Fail "Docker is not installed or not in PATH"
    exit 1
}

# Check Docker is running
try {
    $null = docker info 2>&1
    Write-Ok "Docker daemon is running"
} catch {
    Write-Fail "Docker daemon is not running -- please start Docker Desktop"
    exit 1
}

# Check Node.js
try {
    $nodeVer = node --version 2>&1
    Write-Ok "Node.js found ($nodeVer)"
} catch {
    Write-Fail "Node.js is not installed or not in PATH"
    exit 1
}

# Check if .env exists
if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
    Write-Fail ".env file not found -- copy .env.example and configure it"
    exit 1
}
Write-Ok ".env file found"

# Check node_modules
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Warn "node_modules not found -- installing dependencies..."
    Push-Location $ProjectRoot
    npm install
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Fail "npm install failed"
        exit 1
    }
    Pop-Location
    Write-Ok "Dependencies installed"
} else {
    Write-Ok "Dependencies ready"
}

Write-Host ""

# -- Step 2: Check PostgreSQL ----------------------------
Write-Step "Checking PostgreSQL connection..."

# Read PG_URL from .env
$envContent = Get-Content (Join-Path $ProjectRoot ".env")
$pgLine = $envContent | Where-Object { $_ -match "^PG_URL=" }
$pgUrl = ($pgLine -replace "^PG_URL=", "").Trim()

if (-not $pgUrl) {
    Write-Fail "PG_URL not set in .env"
    exit 1
}

# Quick PG test using node
Push-Location $ProjectRoot
$pgTestScript = "const{Pool}=require('pg');const p=new Pool({connectionString:'$pgUrl',connectionTimeoutMillis:5000});p.query('SELECT 1').then(()=>{console.log('OK');p.end()}).catch(e=>{console.log('FAIL');p.end();process.exit(1)})"
$pgResult = node -e $pgTestScript 2>&1
Pop-Location

if ("$pgResult" -match "OK") {
    Write-Ok "PostgreSQL is reachable"
} else {
    Write-Fail "PostgreSQL is NOT reachable at: $pgUrl"
    Write-Warn "Make sure PostgreSQL is running and the connection string is correct"
    exit 1
}

Write-Host ""

# -- Step 3: Start Docker Containers --------------------
Write-Step "Starting Convex containers (Docker Compose)..."

Push-Location $ProjectRoot
$dockerOutput = cmd /c "docker compose up -d 2>&1"
$dockerExit = $LASTEXITCODE
$dockerOutput -split "`n" | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkGray }
Pop-Location

if ($dockerExit -ne 0) {
    Write-Fail "Docker Compose failed to start"
    exit 1
}

Write-Ok "Docker containers started"

# -- Step 4: Wait for Convex to be Healthy --------------
Write-Step "Waiting for Convex backend to be healthy..."

$convexUrl = "http://127.0.0.1:3210/version"
$maxWait = 60
$elapsed = 0

while ($elapsed -lt $maxWait) {
    try {
        $response = Invoke-WebRequest -Uri $convexUrl -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Ok "Convex backend is healthy (took ${elapsed}s)"
            break
        }
    } catch {
        # Still starting up
    }
    
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host "     Waiting... (${elapsed}s / ${maxWait}s)" -ForegroundColor DarkGray
}

if ($elapsed -ge $maxWait) {
    Write-Fail "Convex backend did not become healthy within ${maxWait}s"
    Write-Warn "Check Docker logs: docker compose logs backend"
    exit 1
}

Write-Host ""

# -- Step 5: Start Express API --------------------------
Write-Step "Starting Express API Gateway..."
Write-Host ""
Write-Host "  ================================================" -ForegroundColor Magenta
Write-Host "    All systems GO! Starting server..."             -ForegroundColor White
Write-Host "    Press Ctrl+C to stop everything"                -ForegroundColor DarkGray
Write-Host "  ================================================" -ForegroundColor Magenta
Write-Host ""

try {
    Push-Location $ProjectRoot
    npx tsx src/server.ts
} finally {
    Pop-Location
    Write-Host ""
    Write-Host "  [STOP] Express stopped -- shutting down Docker containers..." -ForegroundColor Yellow
    Push-Location $ProjectRoot
    cmd /c "docker compose stop 2>&1" | Out-Null
    Pop-Location
    Write-Host "  [DONE] OrderZap backend fully stopped" -ForegroundColor Green
}
