<#
.SYNOPSIS
    Opens two PowerShell windows — one hosting a game, one joining it.
.DESCRIPTION
    Window 1 (Player1): runs the Node.js client as host on $Port.
    Window 2 (Player2): runs the Node.js client and joins $Port after a short delay.

    In-game move prompt accepts JSON, e.g. for Nim:
        {"pile":0,"count":2}    take 2 stones from pile 0
        {"pile":1,"count":5}    take 5 stones from pile 1

    Press  t  during the game to open the chat prompt.
    Press  q  in the lobby to quit.
.EXAMPLE
    .\launch.ps1
    .\launch.ps1 -Port 9876 -Game nim -Player1 alice -Player2 bob
#>
param(
    [int]    $Port    = 9876,
    [string] $Game    = 'nim',
    [string] $Player1 = 'alice',
    [string] $Player2 = 'bob'
)

$nodeDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$hostScript  = "Set-Location '$nodeDir'; node src/main.js --name $Player1 --host $Game --port $Port"
$guestScript = "Set-Location '$nodeDir'; node src/main.js --name $Player2 --join $Port"

Write-Host ""
Write-Host "Opening two windows on port $Port ..."
Write-Host "  Window 1  $Player1  hosts a $Game game"
Write-Host "  Window 2  $Player2  joins after 1.2 s"
Write-Host ""
Write-Host "Nim move format:  {`"pile`":0,`"count`":2}   (take 2 from pile 0)"
Write-Host "Piles start as:   pile 0 = 3   pile 1 = 5   pile 2 = 7"
Write-Host ""

Start-Process powershell -ArgumentList @('-NoExit', '-Command', $hostScript)
Start-Sleep -Milliseconds 1200
Start-Process powershell -ArgumentList @('-NoExit', '-Command', $guestScript)
