foreach ($port in @(3000, 3100)) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force
    Write-Output "killed port $port (pid $($conn.OwningProcess))"
  }
}
