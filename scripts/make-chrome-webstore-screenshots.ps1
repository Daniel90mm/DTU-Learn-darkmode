param(
    [string]$InputDir = "C:\Users\danie\Desktop\Dtu firefox extension",
    [string]$OutputDir = "",
    [ValidateSet("1280x800", "640x400")]
    [string]$Resolution = "1280x800",
    [int]$MaxFiles = 5
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $InputDir)) {
    throw "Input folder not found: $InputDir"
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $InputDir "chrome_webstore_ready"
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

Add-Type -AssemblyName System.Drawing

$parts = $Resolution.Split("x")
$targetW = [int]$parts[0]
$targetH = [int]$parts[1]

$pngFiles = Get-ChildItem -LiteralPath $InputDir -File -Filter *.png |
    Sort-Object Name |
    Select-Object -First $MaxFiles

if (-not $pngFiles -or $pngFiles.Count -eq 0) {
    Write-Host "No PNG files found in: $InputDir"
    exit 0
}

function New-CompliantScreenshot([string]$InputPath, [string]$OutputPath, [int]$W, [int]$H) {
    $src = [System.Drawing.Image]::FromFile($InputPath)
    try {
        $canvas = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        try {
            $g = [System.Drawing.Graphics]::FromImage($canvas)
            try {
                $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

                # Fill background to remove alpha channel influence.
                $g.Clear([System.Drawing.Color]::White)

                # Preserve aspect ratio and letterbox to exact target size.
                $scale = [Math]::Min($W / $src.Width, $H / $src.Height)
                $drawW = [int][Math]::Round($src.Width * $scale)
                $drawH = [int][Math]::Round($src.Height * $scale)
                $x = [int](($W - $drawW) / 2)
                $y = [int](($H - $drawH) / 2)

                $g.DrawImage($src, $x, $y, $drawW, $drawH)
            } finally {
                $g.Dispose()
            }

            # Save as PNG with 24-bit bitmap (no alpha channel in source bitmap).
            $canvas.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $canvas.Dispose()
        }
    } finally {
        $src.Dispose()
    }
}

foreach ($file in $pngFiles) {
    $outPath = Join-Path $OutputDir $file.Name
    New-CompliantScreenshot -InputPath $file.FullName -OutputPath $outPath -W $targetW -H $targetH
    Write-Host "Processed: $($file.Name) -> $outPath"
}

Write-Host ""
Write-Host "Done."
Write-Host "Input folder:  $InputDir"
Write-Host "Output folder: $OutputDir"
Write-Host "Resolution:    $Resolution"
Write-Host "Files:         $($pngFiles.Count) (max $MaxFiles)"
