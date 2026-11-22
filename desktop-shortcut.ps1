$ErrorActionPreference = 'Stop'
$shell = New-Object -ComObject WScript.Shell
$path = Join-Path $PSScriptRoot 'AniHub.lnk'
$shortcut = $shell.CreateShortcut($path)
$shortcut.TargetPath = (Join-Path $PSScriptRoot 'start.bat')
$shortcut.Description = 'Start AniHub room servers'
$shortcut.Save()
Write-Host "Shortcut created: $path"
