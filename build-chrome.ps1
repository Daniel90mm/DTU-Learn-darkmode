$src = $PSScriptRoot
$tmp = Join-Path $env:TEMP 'dtu-chrome-build'

Remove-Item -Force (Join-Path $src 'dtu-dark-mode-chrome.zip') -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

Copy-Item (Join-Path $src 'manifest_chrome.json') (Join-Path $tmp 'manifest.json')
$files = @('darkmode.js','darkmode.css','icon_48.png','icon_128.png','dtuaften.jpg','logo_dark.png','Corp_White_Transparent.png','Mojangles text.png','Mojangles text darkmode off.png','PRIVACY.md')
foreach ($f in $files) {
    Copy-Item (Join-Path $src $f) (Join-Path $tmp $f)
}

Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath (Join-Path $src 'dtu-dark-mode-chrome.zip')
Remove-Item -Recurse -Force $tmp
Write-Host "Chrome zip built successfully."
