<# 
  ================================================
  OrderZap v2 -- Zero-to-Hero Bootstrapper
  ================================================
  
  This script installs requirements on a perfectly BLANK Windows computer:
  1. Checks for Node.js (installs via Winget if missing)
  2. Checks for Docker (installs Docker Desktop via Winget if missing)
  3. Triggers the Node.js setup orchestrator.
#>

$ErrorActionPreference = "Continue"

function Write-Step($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

# Check Administrator privileges (needed for Docker install)
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Step "Checking Node.js..."
try {
    $nodeVer = node --version 2>&1
    Write-Ok "Node.js found: $nodeVer"
} catch {
    Write-Warn "Node.js not found. Installing via Winget..."
    winget install OpenJS.NodeJS -e --silent --accept-package-agreements --accept-source-agreements
    
    # Reload profile/path so Node is accessible in this script
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Step "Checking Docker..."
try {
    $null = docker --version 2>&1
    Write-Ok "Docker found."
} catch {
    Write-Warn "Docker not found."
    if (-not $IsAdmin) {
        Write-Host ""
        Write-Host "=========================================================" -ForegroundColor Red
        Write-Host "CRITICAL:" -ForegroundColor Red
        Write-Host "Docker needs to be installed, but this script is not"
        Write-Host "running as Administrator! Please right-click PowerShell,"
        Write-Host "run as Administrator, and execute this file again."
        Write-Host "=========================================================" -ForegroundColor Red
        exit 1
    }
    
    Write-Warn "Installing Docker Desktop via Winget. This may take a while..."
    winget install Docker.DockerDesktop -e --silent --accept-package-agreements --accept-source-agreements
    
    Write-Warn "Docker installed. A SYSTEM REBOOT might be required to enable WSL 2."
    Write-Warn "Please start Docker Desktop from your Start menu after reboot."
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Step "Ensuring Docker daemon is running..."
try {
    $null = docker info 2>&1
} catch {
    Write-Warn "Docker daemon is asleep. Waking it up..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Start-Sleep -Seconds 10
}

Write-Step "Handoff to Setup Orchestrator (Node.js)..."
node scripts/setup.js
