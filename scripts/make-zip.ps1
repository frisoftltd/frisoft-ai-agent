<#
  make-zip.ps1 — Build deploy/frisoft-site.zip from the contents of public/,
  with index.html at the top level of the archive (no wrapping "public" folder).
  Run via: npm run zip
  Built in: Phase 1 (Fri Soft demo site) — deploy step for cPanel File Manager.
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $repoRoot 'public'
$deployDir = Join-Path $repoRoot 'deploy'
$zipPath = Join-Path $deployDir 'frisoft-site.zip'

if (-not (Test-Path $publicDir)) {
    Write-Error "public/ not found at $publicDir"
    exit 1
}

New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $publicDir '*') -DestinationPath $zipPath -Force

# ---- Verify: index.html must be at the top level, no forbidden content ----
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$entries = $zip.Entries | ForEach-Object { $_.FullName -replace '\\', '/' }
$zip.Dispose()

$failed = $false

if ($entries -notcontains 'index.html') {
    Write-Error "FAIL: index.html is not at the top level of the zip."
    $failed = $true
}

$forbiddenPatterns = @('server/', 'docs/', 'node_modules/', '.env', 'config.json', 'package.json', 'package-lock.json')
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
