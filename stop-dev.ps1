
# BookMyGadi — Stop All Dev Services
Write-Host ""
Write-Host "  ⏹️  Stopping BookMyGadi Dev Services..." -ForegroundColor Red
Write-Host ""

$ROOT = $PSScriptRoot
$pidFile = "$ROOT\.dev-pids.txt"

if (Test-Path $pidFile) {
    Get-Content $pidFile | ForEach-Object {
        $parts = $_ -split "="
        $name = $parts[0]
        $pid  = $parts[1]
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "  ✅ Stopped $name (PID: $pid)" -ForegroundColor Green
        } catch {
            Write-Host "  ℹ️  $name (PID: $pid) already stopped" -ForegroundColor DarkGray
        }
    }
    Remove-Item $pidFile -Force
}

# Kill any remaining processes on dev ports
@(8000, 5173) | ForEach-Object {
    $port = $_
    $procs = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($procs) {
        $pids = $procs | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            try {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                Write-Host "  ✅ Killed process on port $port (PID: $p)" -ForegroundColor Green
            } catch {}
        }
    }
}

# Kill cloudflared tunnels
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  ✅ Stopped all cloudflared tunnels" -ForegroundColor Green

Write-Host ""
Write-Host "  All services stopped." -ForegroundColor Cyan
Write-Host ""
