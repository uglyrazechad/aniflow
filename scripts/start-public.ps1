# AniFlow: поднимает сайт локально и открывает к нему публичный доступ через Cloudflare Tunnel.
# Запуск: двойной клик по start-public.cmd (или по ярлыку AniFlow на рабочем столе).

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $env:LOCALAPPDATA 'AniFlow'
$cloudflared = Join-Path $dir 'cloudflared.exe'
$log = Join-Path $dir 'cloudflared.log'
$urlFile = Join-Path $dir 'public-url.txt'
$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'AniFlow.url'

New-Item -ItemType Directory -Force -Path $dir | Out-Null

function Test-Site {
  try {
    return (Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-Site)) {
  if (-not (Test-Path (Join-Path $root '.next\BUILD_ID'))) {
    Write-Host 'Собираю проект (первый запуск, 1-3 минуты)...'
    Push-Location $root
    cmd /c 'npm run build'
    Pop-Location
  }

  Write-Host 'Запускаю сайт...'
  Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c', "npm start > `"$dir\app.log`" 2>&1" `
    -WorkingDirectory $root -WindowStyle Hidden

  $ok = $false
  for ($i = 0; $i -lt 120; $i++) {
    if (Test-Site) { $ok = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ok) {
    Write-Host "Сайт не поднялся. Лог: $dir\app.log"
    Read-Host 'Enter, чтобы закрыть'
    exit 1
  }
}

Write-Host 'Открываю туннель Cloudflare...'
Start-Process -FilePath $cloudflared `
  -ArgumentList 'tunnel', '--url', 'http://localhost:3000', '--no-autoupdate' `
  -RedirectStandardError $log -WindowStyle Hidden

$publicUrl = $null
for ($i = 0; $i -lt 90; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $log) {
    $found = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches |
      ForEach-Object { $_.Matches.Value } | Select-Object -Last 1
    if ($found) { $publicUrl = $found; break }
  }
}

if (-not $publicUrl) {
  Write-Host "Не дождался адреса туннеля. Лог: $log"
  Read-Host 'Enter, чтобы закрыть'
  exit 1
}

$publicUrl | Set-Content -Path $urlFile -Encoding ascii
"[InternetShortcut]`r`nURL=$publicUrl`r`n" | Set-Content -Path $desktopShortcut -Encoding ascii
Set-Clipboard -Value $publicUrl

Write-Host ''
Write-Host "Сайт доступен по адресу: $publicUrl" -ForegroundColor Green
Write-Host 'Ярлык «AniFlow» на рабочем столе обновлён, ссылка скопирована в буфер.'
Write-Host ''
Write-Host 'Это окно можно закрыть: сайт работает, пока включён компьютер.'
Write-Host 'Чтобы выключить сайт, завершите процессы cloudflared и node в Диспетчере задач.'
Write-Host ''
Read-Host 'Enter, чтобы закрыть это окно'
