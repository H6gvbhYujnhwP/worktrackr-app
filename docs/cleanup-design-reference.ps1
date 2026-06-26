<#
.SYNOPSIS
    Removes the Manus design-reference images (~124 MB) from docs/design.

.DESCRIPTION
    While the app was being reskinned, docs/design held ~52 PNG/WebP mockups
    (in assets/ and batch_a..batch_f) used ONLY as a visual reference. They are
    not used by the app and just bloat the repository. This script deletes them.

    It is scoped to docs\design and will NEVER touch the real in-app graphic at
    web\client\src\app\src\assets\wriggly_flourish.webp (that lives in a
    completely separate folder).

.NOTES
    * Run from the repository ROOT (the folder that contains the "web" and
      "docs" folders) -- e.g. C:\repos\worktrackr-app.
    * Run it AFTER Manus has finished the redesign -- Manus uses these images
      as its reference, so don't delete them before it's done.
    * After it runs, commit the deletion (e.g. in GitHub Desktop) so the repo
      actually shrinks.

.PARAMETER All
    Also remove the small design .md docs and the whole docs\design folder
    (by default only the image files are removed; the .md specs are kept).

.PARAMETER Force
    Skip the confirmation prompt.

.EXAMPLE
    # From the repo root, the normal way (asks before deleting):
    powershell -ExecutionPolicy Bypass -File .\cleanup-design-reference.ps1

.EXAMPLE
    # See what it WOULD delete without deleting anything:
    powershell -ExecutionPolicy Bypass -File .\cleanup-design-reference.ps1 -WhatIf

.EXAMPLE
    # Remove the entire docs\design folder, no prompt:
    powershell -ExecutionPolicy Bypass -File .\cleanup-design-reference.ps1 -All -Force
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$All,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Write-Info  ($m) { Write-Host $m -ForegroundColor Cyan }
function Write-Ok    ($m) { Write-Host $m -ForegroundColor Green }
function Write-Warn  ($m) { Write-Host $m -ForegroundColor Yellow }
function Write-Err   ($m) { Write-Host $m -ForegroundColor Red }
function Write-Dim   ($m) { Write-Host $m -ForegroundColor DarkGray }

# 1. Confirm we're at the repository root.
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root 'web')) -or -not (Test-Path (Join-Path $root 'docs'))) {
    Write-Err "This doesn't look like the repo root."
    Write-Err "Open PowerShell in the folder that contains 'web' and 'docs' (e.g. C:\repos\worktrackr-app) and run it again."
    exit 1
}

$designDir = Join-Path $root 'docs\design'
if (-not (Test-Path $designDir)) {
    Write-Ok "Nothing to do -- docs\design doesn't exist (already cleaned)."
    exit 0
}

# 2. Safety note: the live in-app asset is in a separate tree and is never targeted.
$liveAsset = Join-Path $root 'web\client\src\app\src\assets\wriggly_flourish.webp'

# 3. Work out what we're removing.
if ($All) {
    $description = "the ENTIRE docs\design folder (reference images + design .md specs)"
    $items = @(Get-Item -LiteralPath $designDir)
    $sizeBytes = (Get-ChildItem -LiteralPath $designDir -Recurse -File -ErrorAction SilentlyContinue |
                  Measure-Object -Property Length -Sum).Sum
} else {
    $imageExt = '.png','.jpg','.jpeg','.webp','.gif','.svg'
    $items = Get-ChildItem -LiteralPath $designDir -Recurse -File -ErrorAction SilentlyContinue |
             Where-Object { $imageExt -contains $_.Extension.ToLower() }
    $description = "{0} reference image file(s) under docs\design" -f ($items | Measure-Object).Count
    $sizeBytes = ($items | Measure-Object -Property Length -Sum).Sum
}

if (-not $items -or ($items | Measure-Object).Count -eq 0) {
    Write-Ok "Nothing to remove -- docs\design has no reference images. Already clean."
    exit 0
}

$sizeMb = [math]::Round(($sizeBytes / 1MB), 1)

Write-Host ""
Write-Info "About to delete $description (~$sizeMb MB)."
Write-Dim  "Scope: docs\design only."
Write-Dim  "The live app graphic is NOT touched:"
Write-Dim  "  $liveAsset"
Write-Host ""

# 4. -WhatIf: report and stop.
if ($WhatIfPreference) {
    Write-Warn "WhatIf: nothing was deleted. Re-run without -WhatIf to actually remove the files."
    exit 0
}

# 5. Confirm unless -Force.
if (-not $Force) {
    $answer = Read-Host "Type Y to delete, anything else to cancel"
    if ($answer -ne 'Y' -and $answer -ne 'y') {
        Write-Warn "Cancelled. Nothing was deleted."
        exit 0
    }
}

# 6. Delete.
if ($All) {
    Remove-Item -LiteralPath $designDir -Recurse -Force
} else {
    $items | Remove-Item -Force
    # tidy up any folders that are now empty (deepest first)
    Get-ChildItem -LiteralPath $designDir -Recurse -Directory -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Where-Object { -not (Get-ChildItem -LiteralPath $_.FullName -Recurse -File -ErrorAction SilentlyContinue) } |
        Remove-Item -Recurse -Force
}

Write-Host ""
Write-Ok  "Done. Freed ~$sizeMb MB."
Write-Dim "Now commit the deletion (e.g. GitHub Desktop) so the repo shrinks on GitHub/Render."
