$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot "assets\app-icon-workshop.png"
$resourceRoot = Join-Path $projectRoot "android\app\src\main\res"

if (-not (Test-Path -LiteralPath $sourcePath)) { throw "No se encontró el icono fuente: $sourcePath" }

$densities = @{
  "mdpi" = @{ Legacy = 48; Foreground = 108 }
  "hdpi" = @{ Legacy = 72; Foreground = 162 }
  "xhdpi" = @{ Legacy = 96; Foreground = 216 }
  "xxhdpi" = @{ Legacy = 144; Foreground = 324 }
  "xxxhdpi" = @{ Legacy = 192; Foreground = 432 }
}

function Save-ResizedPng([System.Drawing.Image]$source, [int]$size, [string]$destination, [bool]$round) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    if ($round) {
      $path = New-Object System.Drawing.Drawing2D.GraphicsPath
      try { $path.AddEllipse(0, 0, $size, $size); $graphics.SetClip($path) } finally { $path.Dispose() }
    }
    $graphics.DrawImage($source, 0, 0, $size, $size)
    $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$source = [System.Drawing.Image]::FromFile($sourcePath)
try {
  foreach ($density in $densities.Keys) {
    $directory = Join-Path $resourceRoot ("mipmap-" + $density)
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    Save-ResizedPng $source $densities[$density].Legacy (Join-Path $directory "ic_launcher.png") $false
    Save-ResizedPng $source $densities[$density].Legacy (Join-Path $directory "ic_launcher_round.png") $true
    Save-ResizedPng $source $densities[$density].Foreground (Join-Path $directory "ic_launcher_foreground.png") $false
  }
} finally {
  $source.Dispose()
}

Write-Host "Iconos Android generados desde $sourcePath"
