<#
  make-app-zip.ps1 — Build deploy/frisoft-app.zip, the Node app root for the
  cPanel "Setup Node.js App" feature. Contains package.json, package-lock.json,
  server/ and public/, with package.json at the top level of the archive (no
  wrapping folder) so cPanel can find it directly under the app root.
  Run via: npm run zip:app
  Built in: Phase 1 (Fri Soft demo site) — Step 2 deploy (static-only server).
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$deployDir = Join-Path $repoRoot 'deploy'
$zipPath = Join-Path $deployDir 'frisoft-app.zip'

$includePaths = @('package.json', 'package-lock.json', 'server', 'public')
foreach ($p in $includePaths) {
    $full = Join-Path $repoRoot $p
    if (-not (Test-Path $full)) {
        Write-Error "Required path not found: $full"
        exit 1
    }
}

New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Stage into a temp folder so the zip has package.json etc. at the top level,
# with no node_modules/.env/docs/deploy/.git/README/zip files included.
$stageDir = Join-Path $deployDir 'app-stage'
if (Test-Path $stageDir) {
    Remove-Item $stageDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stageDir | Out-Null

Copy-Item -Path (Join-Path $repoRoot 'package.json') -Destination $stageDir
Copy-Item -Path (Join-Path $repoRoot 'package-lock.json') -Destination $stageDir
Copy-Item -Path (Join-Path $repoRoot 'server') -Destination $stageDir -Recurse
Copy-Item -Path (Join-Path $repoRoot 'public') -Destination $stageDir -Recurse

Compress-Archive -Path (Join-Path $stageDir '*') -DestinationPath $zipPath -Force

Remove-Item $stageDir -Recurse -Force

# ---- Verify: package.json and server/server.js must be at the top level,
#      no forbidden content present ----
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$entries = $zip.Entries | ForEach-Object { $_.FullName -replace '\\', '/' }
$zip.Dispose()

$failed = $false

if ($entries -notcontains 'package.json') {
    Write-Error "FAIL: package.json is not at the top level of the zip."
    $failed = $true
}

if ($entries -notcontains 'server/server.js') {
    Write-Error "FAIL: server/server.js is not at the top level of the zip."
    $failed = $true
}

$forbiddenPatterns = @('node_modules/', '.env', 'docs/', 'deploy/', '.git/', 'README', '.zip')
foreach ($pat in $forbiddenPatterns) {
    $hits = $entries | Where-Object { $_ -like "*$pat*" }
    if ($hits) {
        Write-Error "FAIL: zip contains forbidden entries matching '$pat': $($hits -join ', ')"
        $failed = $true
    }
}

if ($failed) {
    Write-Error "Zip verification failed. Deleting $zipPath so a bad zip isn't left behind."
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    exit 1
}

$size = (Get-Item $zipPath).Length
Write-Output "Built $zipPath ($size bytes)"
Write-Output "Entries:"
$entries | ForEach-Object { Write-Output "  $_" }
