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

$rootFiles = @("index.html", "dashboard.html", "buscador-unidades.html", "privacidad.html", "terminos.html", "cookies.html", "CNAME", "VERSION.json")
foreach ($file in $rootFiles) {
  $source = Join-Path $resolvedProjectRoot $file
  if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $resolvedOutputDirectory }
}

$assetDirectories = @("css", "js", "modulos", "templates")
foreach ($directory in $assetDirectories) {
  $source = Join-Path $resolvedProjectRoot $directory
  if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $resolvedOutputDirectory -Recurse }
}

$version = (Get-Content -LiteralPath (Join-Path $resolvedOutputDirectory "VERSION.json") -Raw | ConvertFrom-Json).version
$config = Get-Content -LiteralPath (Join-Path $resolvedOutputDirectory "js/core/supabase.js") -Raw
if (-not $config.Contains('APP_VERSION: "' + $version + '"')) { throw "La versión web no coincide con VERSION.json." }
$login = Get-Content -LiteralPath (Join-Path $resolvedOutputDirectory "js/core/auth.js") -Raw
if (-not $login.Contains("iniciar_sesion_aplicacion")) { throw "El paquete no incluye el acceso por sesión del servidor." }
Write-Host "Aplicación web $version preparada en $resolvedOutputDirectory"
