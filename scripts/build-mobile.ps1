$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $projectRoot "www"
$resolvedProjectRoot = [System.IO.Path]::GetFullPath($projectRoot)
$resolvedOutputDirectory = [System.IO.Path]::GetFullPath($outputDirectory)

if (-not $resolvedOutputDirectory.StartsWith($resolvedProjectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "La carpeta de salida debe permanecer dentro del proyecto."
}

if (Test-Path -LiteralPath $resolvedOutputDirectory) {
  Remove-Item -LiteralPath $resolvedOutputDirectory -Recurse -Force
}
New-Item -ItemType Directory -Path $resolvedOutputDirectory | Out-Null

$rootFiles = @("index.html", "dashboard.html", "buscador-unidades.html", "CNAME")
foreach ($file in $rootFiles) {
  $source = Join-Path $resolvedProjectRoot $file
  if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $resolvedOutputDirectory }
}

$assetDirectories = @("css", "js", "modulos", "templates")
foreach ($directory in $assetDirectories) {
  $source = Join-Path $resolvedProjectRoot $directory
  if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $resolvedOutputDirectory -Recurse }
}

Write-Host "Aplicación web preparada en $resolvedOutputDirectory"
