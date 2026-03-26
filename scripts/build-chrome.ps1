$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dist = Join-Path $repoRoot 'dist'
$tempRoot = if ($env:TEMP) { $env:TEMP } elseif ($env:TMP) { $env:TMP } else { [System.IO.Path]::GetTempPath() }
$tmp = Join-Path $tempRoot 'dtu-chrome-build'
$outZip = Join-Path $dist 'dtu-dark-mode-chrome.zip'
$outUnpacked = Join-Path $dist 'chrome-unpacked'

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

function Add-LocalOverrideHostPermissions([string]$ManifestPath, [string]$ConfigText) {
    $manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
    $permissions = @($manifest.host_permissions)
    $didChange = $false
    $matches = [regex]::Matches($ConfigText, 'https://[^"''\s]+')
    foreach ($match in $matches) {
        try {
            $uri = [Uri]$match.Value
            $permission = '{0}://{1}/*' -f $uri.Scheme, $uri.Host
            if (-not ($permissions -contains $permission)) {
                $permissions = @($permissions + $permission)
                $didChange = $true
            }
        } catch {
        }
    }
    if ($didChange) {
        $manifest.host_permissions = $permissions
        $manifest | ConvertTo-Json -Depth 100 | Set-Content -Path $ManifestPath
    }
}

function Copy-BuildConfig([string]$RepoRoot, [string]$DestConfig, [string]$ManifestPath) {
    $baseConfig = Join-Path $RepoRoot 'config.js'
    $localConfig = Join-Path $RepoRoot 'config.local.js'
    Copy-Item $baseConfig $DestConfig
    if (-not (Test-Path $localConfig)) { return }

    $localText = Get-Content $localConfig -Raw
    if ($localText -match '\b(const|let|var)\s+CONFIG\b') {
        Set-Content -Path $DestConfig -Value $localText -NoNewline
    } else {
        Add-Content -Path $DestConfig -Value "`r`n"
        Add-Content -Path $DestConfig -Value $localText
    }
    Add-LocalOverrideHostPermissions -ManifestPath $ManifestPath -ConfigText $localText
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null
Remove-Item -Force $outZip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $outUnpacked -ErrorAction SilentlyContinue
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
    if ($f -eq 'config.js') {
        Copy-BuildConfig -RepoRoot $repoRoot -DestConfig (Join-Path $tmp $f) -ManifestPath (Join-Path $tmp 'manifest.json')
        continue
    }
    Copy-Item (Join-Path $repoRoot $f) (Join-Path $tmp $f)
}

Copy-Item -Recurse -Force (Join-Path $repoRoot 'images') (Join-Path $tmp 'images')

New-Item -ItemType Directory -Path $outUnpacked -Force | Out-Null
Copy-Item -Recurse -Force (Join-Path $tmp '*') $outUnpacked

New-ZipWithForwardSlashes -SourceDir $tmp -DestZip $outZip
Remove-Item -Recurse -Force $tmp
Write-Host "Chrome zip built successfully: $outZip"
