$ErrorActionPreference = 'Stop'
$startup = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
New-Item -ItemType Directory -Force -Path $startup | Out-Null
$shortcut = Join-Path $startup 'AniHub.lnk'
if (Test-Path $shortcut) { Remove-Item -LiteralPath $shortcut -Force }
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($shortcut)
$lnk.TargetPath = 'C:\anime-site\start.bat'
$lnk.Save()
Write-Host "Startup link: $shortcut"
