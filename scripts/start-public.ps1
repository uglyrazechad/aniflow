$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $env:LOCALAPPDATA 'AniHub'
$cloudflared = Join-Path $dir 'cloudflared.exe'
$log = Join-Path $dir 'cloudflared.log'
$urlFile = Join-Path $dir 'public-url.txt'
$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'AniHub.url'

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
    Write-Host 'Собираю проект...'
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
    exit 1
  }
}

Write-Host 'Открываю туннель...'
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
  exit 1
}

$publicUrl | Set-Content -Path $urlFile -Encoding ascii
"[InternetShortcut]`r`nURL=$publicUrl`r`n" | Set-Content -Path $desktopShortcut -Encoding ascii
Set-Clipboard -Value $publicUrl

Write-Host "Сайт доступен по адресу: $publicUrl" -ForegroundColor Green
