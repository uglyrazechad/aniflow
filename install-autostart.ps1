$ErrorActionPreference = 'Stop'
$name = 'AniHubWatchParty'
$value = (Join-Path $PSScriptRoot 'start.bat')
New-ItemProperty -Path HKCU:\Software\Microsoft\Windows\CurrentVersion\Run -Name $name -Value "`"$value`"" -Force | Out-Null
Write-Host "Autostart registered: $value"
