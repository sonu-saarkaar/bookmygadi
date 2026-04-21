param(
    [switch]$Public,
    [switch]$LocalOnly,
    [switch]$NoAndroid
)

$ErrorActionPreference = "Stop"

$ROOT = $PSScriptRoot
$FRONT = Join-Path $ROOT "frontend"
$BACK = Join-Path $ROOT "backend"
$ANDROID = Join-Path $ROOT "android"
$API_PORT = 8000
$WEB_PORT = 5173

function Write-Info([string]$m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Write-Ok([string]$m) { Write-Host "[OK]   $m" -ForegroundColor Green }
function Write-Warn([string]$m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }

function Get-LanIp {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notmatch "^127\." -and
            $_.IPAddress -notmatch "^169\.254\." -and
            (
                $_.IPAddress -match "^192\.168\." -or
                $_.IPAddress -match "^10\." -or
                $_.IPAddress -match "^172\.(1[6-9]|2[0-9]|3[0-1])\."
            )
        } |
        Select-Object -First 1

    if ($ip) { return $ip.IPAddress }

    $parsed = ipconfig | Select-String "IPv4"
    foreach ($line in $parsed) {
        $cand = (($line -split ":")[-1]).Trim()
        if (
            $cand -match "^192\.168\." -or
            $cand -match "^10\." -or
            $cand -match "^172\.(1[6-9]|2[0-9]|3[0-1])\."
        ) {
            return $cand
        }
    }

    return $null
}

function Stop-PortProcess([int]$Port) {
    $cons = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $cons) { return }

    $pids = $cons | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
        try {
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        } catch {}
    }
}

$lanIp = Get-LanIp
if (-not $lanIp) {
    throw "Could not detect LAN IP. Connect to Wi-Fi and try again."
}

$apiUrl = "http://$($lanIp):$API_PORT"
$webUrl = "http://$($lanIp):$WEB_PORT"

Write-Info "Detected LAN IP: $lanIp"

Write-Info "Freeing ports $API_PORT and $WEB_PORT"
Stop-PortProcess -Port $API_PORT
Stop-PortProcess -Port $WEB_PORT

Write-Info "Updating frontend/.env.android"
$envAndroid = @"
VITE_API_BASE_URL="$apiUrl"
VITE_GOOGLE_MAPS_API_KEY="AIzaSyDAfy7Rud99gcPIUWLnRZ-Prc4oooGbQu8"
"@
Set-Content -Path (Join-Path $FRONT ".env.android") -Value $envAndroid -Encoding UTF8

$localPropPath = Join-Path $ANDROID "local.properties"
if (Test-Path $localPropPath) {
    Write-Info "Updating android/local.properties"
    $lp = Get-Content $localPropPath -Raw
    if ($lp -match "(?m)^SERVER_IP=") {
        $lp = $lp -replace "(?m)^SERVER_IP=.*$", "SERVER_IP=$lanIp"
    } else {
        $lp += "`nSERVER_IP=$lanIp"
    }

    if ($lp -match "(?m)^WEB_PORT=") {
        $lp = $lp -replace "(?m)^WEB_PORT=.*$", "WEB_PORT=$WEB_PORT"
    } else {
        $lp += "`nWEB_PORT=$WEB_PORT"
    }

    if ($lp -match "(?m)^API_PORT=") {
        $lp = $lp -replace "(?m)^API_PORT=.*$", "API_PORT=$API_PORT"
    } else {
        $lp += "`nAPI_PORT=$API_PORT"
    }

    if ($lp -match "(?m)^PUBLIC_API_URL=") {
        $lp = $lp -replace "(?m)^PUBLIC_API_URL=.*$", "PUBLIC_API_URL="
    }

    if ($lp -match "(?m)^PUBLIC_WEB_URL=") {
        $lp = $lp -replace "(?m)^PUBLIC_WEB_URL=.*$", "PUBLIC_WEB_URL="
    }

    Set-Content -Path $localPropPath -Value $lp -Encoding UTF8
}

Write-Info "Starting backend on 0.0.0.0:$API_PORT"
$backend = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile", "-Command",
    "Set-Location '$BACK'; if (Test-Path '.\\.venv\\Scripts\\activate') { . .\\.venv\\Scripts\\activate }; uvicorn app.main:app --host 0.0.0.0 --port $API_PORT --reload"
) -WindowStyle Normal -PassThru

Write-Info "Starting frontend on 0.0.0.0:$WEB_PORT"
$frontend = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile", "-Command",
    "Set-Location '$FRONT'; npm run dev -- --host 0.0.0.0 --port $WEB_PORT"
) -WindowStyle Normal -PassThru

$pidFile = Join-Path $ROOT ".dev-pids.txt"
"backend=$($backend.Id)" | Set-Content $pidFile
"frontend=$($frontend.Id)" | Add-Content $pidFile

Write-Host ""
Write-Ok "Backend:  $apiUrl"
Write-Ok "Frontend: $webUrl"
Write-Ok "PID file: .dev-pids.txt"

if ($Public -and -not $LocalOnly) {
    Write-Warn "Public mode requested. Use cloudflared manually for a public URL:"
    Write-Host "cloudflared tunnel --url http://localhost:$WEB_PORT"
}

Write-Host ""
Write-Host "Open this in phone browser (same Wi-Fi): $webUrl"
