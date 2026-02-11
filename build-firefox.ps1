$src = $PSScriptRoot
$tmp = Join-Path $env:TEMP 'dtu-firefox-build'

Remove-Item -Force (Join-Path $src 'dtu-dark-mode-firefox.zip') -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

$files = @(
    'manifest.json',
    'background.js',
    'config.js',
    'darkmode.js',
    'icon_48.png',
    'icon_128.png',
    'dtuaften.jpg',
    'logo_dark.png',
    'Corp_White_Transparent.png',
    'Mojangles text.png',
    'Mojangles text darkmode off.png',
    'PRIVACY.md'
)

foreach ($f in $files) {
    Copy-Item (Join-Path $src $f) (Join-Path $tmp $f)
}

Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath (Join-Path $src 'dtu-dark-mode-firefox.zip')
Remove-Item -Recurse -Force $tmp
Write-Host "Firefox zip built successfully."
