# This is a comment in Vietnamese (ASCII-safe): wait for Docker Engine, rebuild customer-web, then capture final mobile pages
$ErrorActionPreference = 'Continue'
Write-Output '[wait] waiting for Docker Engine...'
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  $job = Start-Job { docker info --format '{{.ServerVersion}}' 2>&1 }
  Wait-Job $job -Timeout 30 | Out-Null
  $res = ''
  if ($job.State -eq 'Completed') { $res = (Receive-Job $job | Out-String).Trim(); Remove-Job $job -Force }
  else { Stop-Job $job -ErrorAction SilentlyContinue; Remove-Job $job -Force -ErrorAction SilentlyContinue }
  if ($res -match '^[0-9]+\.') { Write-Output "[wait] Docker OK ($res) after $i tries"; $ok = $true; break }
  Write-Output "[wait] not yet (try $($i + 1)/40), sleep 45s"
  Start-Sleep -Seconds 45
}
if (-not $ok) { Write-Output '[FAIL] docker did not answer within ~30 min'; exit 1 }
Write-Output '[build] docker compose up -d --build customer-web'
docker compose up -d --build customer-web
if ($LASTEXITCODE -ne 0) { Write-Output '[FAIL] compose build returned error'; exit 1 }
Write-Output '[wait] waiting for port 8080'
for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep -Seconds 5
  try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 http://localhost:8080/; if ($r.StatusCode -eq 200) { Write-Output "[ok] 8080 answered (try $($i + 1))"; break } } catch {}
}
Write-Output '[shot] mobile captures: home, products'
$env:MOBILE = '390,900'; $env:TAG = 'm'; $env:ONLY = 'home,products'; $env:NO_ADMIN = '1'
node ./scripts/shot.mjs
Write-Output "[done] shot exit=$LASTEXITCODE"
