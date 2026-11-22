# Обёртка start-public.ps1: подавляет интерактивный Read-Host в конце скрипта.
function Read-Host { }
. (Join-Path $PSScriptRoot 'scripts\start-public.ps1')
