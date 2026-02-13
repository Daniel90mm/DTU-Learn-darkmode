$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dist = Join-Path $repoRoot 'dist'
$tmp = Join-Path $env:TEMP 'dtu-chrome-build'
$outZip = Join-Path $dist 'dtu-dark-mode-chrome.zip'

function New-ZipWithForwardSlashes([string]$SourceDir, [string]$DestZip) {
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    if (Test-Path $DestZip) { Remove-Item -Force $DestZip }

    $base = (Resolve-Path $SourceDir).Path
    if (-not $base.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $base = $base + [System.IO.Path]::DirectorySeparatorChar
    }

    $zip = [System.IO.Compression.ZipFile]::Open($DestZip, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        $files = Get-ChildItem -Path $SourceDir -Recurse -File
        foreach ($f in $files) {
            $full = $f.FullName
            $rel = if ($full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) { $full.Substring($base.Length) } else { $f.Name }
            $entryName = ($rel -replace '\\', '/').TrimStart('/')
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally {
        $zip.Dispose()
    }
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null
Remove-Item -Force $outZip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

Copy-Item (Join-Path $repoRoot 'manifest_chrome.json') (Join-Path $tmp 'manifest.json')
$files = @(
    'background.js',
    'config.js',
    'darkmode.js',
    'darkmode.css'
)
foreach ($f in $files) {
    Copy-Item (Join-Path $repoRoot $f) (Join-Path $tmp $f)
}

Copy-Item -Recurse -Force (Join-Path $repoRoot 'images') (Join-Path $tmp 'images')

New-ZipWithForwardSlashes -SourceDir $tmp -DestZip $outZip
Remove-Item -Recurse -Force $tmp
Write-Host "Chrome zip built successfully: $outZip"
