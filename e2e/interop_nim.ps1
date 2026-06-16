<#
.SYNOPSIS
    Cross-client interop test: plays a full Nim game between two different client implementations.

.DESCRIPTION
    Runs two scenarios:
      1. Python host (alice) + Node.js join (bob)
      2. Node.js host (alice) + Python join (bob)

    Each scenario plays Nim to completion: alice wins when bob takes the last stone.
    Scripts output PASS:/FAIL: lines that this runner aggregates.

.EXAMPLE
    .\e2e\interop_nim.ps1
    powershell -File e2e\interop_nim.ps1
#>
param()

$ErrorActionPreference = 'Stop'

$ROOT   = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$HELPERS = Join-Path $ROOT 'e2e\helpers'

$py3 = Get-Command python3 -ErrorAction SilentlyContinue
$python = if ($py3) { $py3.Source } else { (Get-Command python -ErrorAction Stop).Source }

$node   = (Get-Command node -ErrorAction Stop).Source

function Get-FreePort {
    $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $l.Start()
    $p = $l.LocalEndpoint.Port
    $l.Stop()
    return $p
}

function Run-Scenario {
    param(
        [string]$Label,
        [string]$HostExe,
        [string]$HostScript,
        [string]$JoinExe,
        [string]$JoinScript,
        [int]$Port
    )

    Write-Host ""
    Write-Host "=== Scenario: $Label  (port $Port) ===" -ForegroundColor Cyan

    $hostOut  = [System.IO.Path]::GetTempFileName()
    $hostErr  = [System.IO.Path]::GetTempFileName()
    $joinOut  = [System.IO.Path]::GetTempFileName()
    $joinErr  = [System.IO.Path]::GetTempFileName()

    $hostProc = Start-Process -FilePath $HostExe -ArgumentList @($HostScript, $Port) `
        -PassThru -NoNewWindow `
        -RedirectStandardOutput $hostOut `
        -RedirectStandardError  $hostErr

    Start-Sleep -Milliseconds 500

    $joinProc = Start-Process -FilePath $JoinExe -ArgumentList @($JoinScript, $Port) `
        -PassThru -NoNewWindow `
        -RedirectStandardOutput $joinOut `
        -RedirectStandardError  $joinErr

    $joined = $joinProc | Wait-Process -Timeout 20 -ErrorAction SilentlyContinue; $_ = $?
    $hosted = $hostProc | Wait-Process -Timeout 5  -ErrorAction SilentlyContinue; $_ = $?

    if (-not $hostProc.HasExited) { $hostProc.Kill() }
    if (-not $joinProc.HasExited) { $joinProc.Kill() }

    $hostLines = Get-Content $hostOut -ErrorAction SilentlyContinue
    $joinLines = Get-Content $joinOut -ErrorAction SilentlyContinue
    $hostErrTxt = Get-Content $hostErr -ErrorAction SilentlyContinue
    $joinErrTxt = Get-Content $joinErr -ErrorAction SilentlyContinue

    Write-Host "  [HOST]" -ForegroundColor Yellow
    $hostLines | ForEach-Object { Write-Host "    $_" }
    Write-Host "  [JOIN]" -ForegroundColor Yellow
    $joinLines | ForEach-Object { Write-Host "    $_" }

    if ($hostErrTxt) {
        $filtered = $hostErrTxt | Where-Object { $_ -notmatch 'ConnectionResetError|WinError 10054|OSError' }
        if ($filtered) { Write-Host "  [HOST stderr]" -ForegroundColor Red; $filtered | ForEach-Object { Write-Host "    $_" } }
    }
    if ($joinErrTxt) {
        $filtered = $joinErrTxt | Where-Object { $_ -notmatch 'ConnectionResetError|WinError 10054|OSError' }
        if ($filtered) { Write-Host "  [JOIN stderr]" -ForegroundColor Red; $filtered | ForEach-Object { Write-Host "    $_" } }
    }

    Remove-Item $hostOut,$hostErr,$joinOut,$joinErr -ErrorAction SilentlyContinue

    $allLines = @($hostLines) + @($joinLines)
    $passes = ($allLines | Where-Object { $_ -match '^PASS:' }).Count
    $fails  = ($allLines | Where-Object { $_ -match '^FAIL:' }).Count

    if ($fails -gt 0) {
        Write-Host "  RESULT: FAIL  ($passes passed, $fails failed)" -ForegroundColor Red
        return $false
    }
    Write-Host "  RESULT: PASS  ($passes checks passed)" -ForegroundColor Green
    return $true
}

Write-Host ""
Write-Host "=== Cross-Client Interop: Nim ===" -ForegroundColor Magenta
Write-Host "  Game: Nim [3,5,7]  alice goes first  bob takes last stone (wins)"
Write-Host "  Python: $python"
Write-Host "  Node:   $node"

$results = @()

# Scenario 1: Python host (alice) + Node.js join (bob)
$port1 = Get-FreePort
$ok1 = Run-Scenario `
    -Label     "Python host  +  Node.js join" `
    -HostExe   $python `
    -HostScript (Join-Path $HELPERS 'py_host_alice.py') `
    -JoinExe   $node `
    -JoinScript (Join-Path $HELPERS 'node_bob_join.js') `
    -Port       $port1
$results += $ok1

Start-Sleep -Milliseconds 300

# Scenario 2: Node.js host (alice) + Python join (bob)
$port2 = Get-FreePort
$ok2 = Run-Scenario `
    -Label     "Node.js host  +  Python join" `
    -HostExe   $node `
    -HostScript (Join-Path $HELPERS 'node_host_alice.js') `
    -JoinExe   $python `
    -JoinScript (Join-Path $HELPERS 'py_bob_join.py') `
    -Port       $port2
$results += $ok2

Write-Host ""
$passed = ($results | Where-Object { $_ }).Count
$total  = $results.Count
if ($passed -eq $total) {
    Write-Host "=== ALL SCENARIOS PASSED ($passed/$total) ===" -ForegroundColor Green
    exit 0
} else {
    Write-Host "=== FAILED ($passed/$total passed) ===" -ForegroundColor Red
    exit 1
}
