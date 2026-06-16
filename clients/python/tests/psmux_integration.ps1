# psmux integration test: two separate processes simulate host + join
# Tests: player list, GAME_START, chat relay, move
# Run from repo root: powershell -File clients/python/tests/psmux_integration.ps1

param([int]$Port = 47777)

$python = (Get-Command python3 -ErrorAction Stop).Source
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Host "=== psmux integration test ===" -ForegroundColor Cyan
Write-Host "Port  : $Port"
Write-Host "Python: $python"
Write-Host "Root  : $root"
Write-Host ""

$hostScript = @"
import sys, time, threading
sys.path.insert(0, r'$root')
from framework.net.host import Host
from framework.net.client import Client
from framework.net.protocol import MsgType

received = []

def on_msg(msg):
    received.append(msg)
    t = msg.get('type','?')
    print(f'HOST recv [{t}]:', msg, flush=True)

h = Host(port=$Port, game_name='nim', max_players=2)
h.start()
time.sleep(0.2)

c = Client('127.0.0.1', $Port, 'alice', on_msg)
c.connect()
time.sleep(5)

if any(m.get('type') == 'PLAYER_LIST' for m in received):
    print('PASS: player list received', flush=True)
else:
    print('FAIL: no player list received', flush=True)

if any(m.get('type') == 'GAME_START' for m in received):
    print('PASS: GAME_START received', flush=True)
else:
    print('FAIL: no GAME_START received', flush=True)

if any(m.get('type') == 'CHAT' and m.get('text') == 'hello from bob' for m in received):
    print('PASS: chat from bob relayed', flush=True)
else:
    print('FAIL: chat from bob not received', flush=True)

print('HOST done', flush=True)
"@

$joinScript = @"
import sys, time, threading
sys.path.insert(0, r'$root')
from framework.net.client import Client
from framework.net.protocol import MsgType

received = []

def on_msg(msg):
    received.append(msg)
    t = msg.get('type','?')
    print(f'JOIN recv [{t}]:', msg, flush=True)

time.sleep(0.5)
c = Client('127.0.0.1', $Port, 'bob', on_msg)
c.connect()
print('JOIN: bob connected', flush=True)
time.sleep(0.5)

# check game started
if any(m.get('type') == 'GAME_START' for m in received):
    print('PASS: bob got GAME_START', flush=True)
else:
    print('FAIL: bob did not get GAME_START', flush=True)

# send chat
c.send({'type': MsgType.CHAT, 'from': 'bob', 'text': 'hello from bob'})
time.sleep(0.5)

# send move (nim: take 1 from pile 0)
c.send({'type': MsgType.MOVE, 'from': 'alice', 'data': {'pile': 0, 'count': 1}})
time.sleep(0.3)

print('JOIN done', flush=True)
time.sleep(3)
"@

$hostFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$','.py'
$joinFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$','.py'
$hostScript | Out-File -Encoding utf8 -FilePath $hostFile
$joinScript | Out-File -Encoding utf8 -FilePath $joinFile

Write-Host "[1/3] Starting host process..." -ForegroundColor Yellow
$hostProc = Start-Process -FilePath $python -ArgumentList $hostFile `
    -PassThru -NoNewWindow `
    -RedirectStandardOutput "$env:TEMP\itest_host_out.txt" `
    -RedirectStandardError  "$env:TEMP\itest_host_err.txt"

Start-Sleep -Milliseconds 400

Write-Host "[2/3] Starting join process..." -ForegroundColor Yellow
$joinProc = Start-Process -FilePath $python -ArgumentList $joinFile `
    -PassThru -NoNewWindow `
    -RedirectStandardOutput "$env:TEMP\itest_join_out.txt" `
    -RedirectStandardError  "$env:TEMP\itest_join_err.txt"

Write-Host "[3/3] Waiting up to 10s..." -ForegroundColor Yellow
$joinProc | Wait-Process -Timeout 10 -ErrorAction SilentlyContinue
$hostProc | Wait-Process -Timeout 2  -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== HOST output ===" -ForegroundColor Cyan
Get-Content "$env:TEMP\itest_host_out.txt" -ErrorAction SilentlyContinue
$hostErr = Get-Content "$env:TEMP\itest_host_err.txt" -ErrorAction SilentlyContinue
if ($hostErr) { Write-Host "HOST stderr:" -ForegroundColor Red; $hostErr }

Write-Host ""
Write-Host "=== JOIN output ===" -ForegroundColor Cyan
Get-Content "$env:TEMP\itest_join_out.txt" -ErrorAction SilentlyContinue
$joinErr = Get-Content "$env:TEMP\itest_join_err.txt" -ErrorAction SilentlyContinue
if ($joinErr) { Write-Host "JOIN stderr:" -ForegroundColor Red; $joinErr }

Remove-Item $hostFile,$joinFile -ErrorAction SilentlyContinue
if (-not $hostProc.HasExited) { $hostProc.Kill() }
if (-not $joinProc.HasExited) { $joinProc.Kill() }

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
