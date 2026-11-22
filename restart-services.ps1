# Перезапуск cloudflared (туннель) и Electron-окна.
$App = Join-Path $env:LOCALAPPDATA 'AniHub'
$cf = Join-Path $App 'cloudflared.exe'
if (Test-Path $cf) {
  Start-Process -FilePath $cf -ArgumentList 'tunnel', '--url', 'http://localhost:3000', '--no-autoupdate' -WindowStyle Hidden -ErrorAction SilentlyContinue
  Write-Output "cloudflared restarted"
} else {
  Write-Output "WARNING: $cf missing"
}
Start-Process -FilePath 'C:\anime-site\desktop\node_modules\electron\dist\electron.exe' -ArgumentList 'C:\anime-site\desktop\main.js' -WindowStyle Normal -ErrorAction SilentlyContinue
Write-Output "electron started"
