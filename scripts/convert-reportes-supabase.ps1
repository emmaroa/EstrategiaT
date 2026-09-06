param(
  [Parameter(Mandatory=$true)][string]$SourceDirectory,
  [Parameter(Mandatory=$true)][string]$OutputDirectory
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-XlsxRows([string]$FilePath) {
  $zip = [IO.Compression.ZipFile]::OpenRead($FilePath)
  try {
    $shared = @()
    $entry = $zip.GetEntry('xl/sharedStrings.xml')
    if ($entry) {
      $reader = [IO.StreamReader]::new($entry.Open())
      [xml]$xml = $reader.ReadToEnd(); $reader.Dispose()
      foreach ($si in $xml.sst.si) {
        $shared += (($si.SelectNodes('.//*[local-name()="t"]') | ForEach-Object { $_.'#text' }) -join '')
      }
    }
    [xml]$book = ([IO.StreamReader]::new($zip.GetEntry('xl/workbook.xml').Open())).ReadToEnd()
    [xml]$rels = ([IO.StreamReader]::new($zip.GetEntry('xl/_rels/workbook.xml.rels').Open())).ReadToEnd()
    $sheet = @($book.workbook.sheets.sheet)[0]
    $rid = $sheet.GetAttribute('id','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    $rel = $rels.Relationships.Relationship | Where-Object { $_.Id -eq $rid }
    $target = 'xl/' + $rel.Target.TrimStart('/')
    $reader = [IO.StreamReader]::new($zip.GetEntry($target).Open())
    [xml]$sheetXml = $reader.ReadToEnd(); $reader.Dispose()
    $rows = @{}
    foreach ($row in @($sheetXml.worksheet.sheetData.row)) {
      $cells = @{}
      foreach ($cell in @($row.c)) {
        $column = ([regex]::Match([string]$cell.r, '^[A-Z]+')).Value
        $value = [string]$cell.v
        if ($cell.t -eq 's' -and $value -ne '') { $value = $shared[[int]$value] }
        elseif ($cell.t -eq 'inlineStr') { $value = (($cell.is.SelectNodes('.//*[local-name()="t"]') | ForEach-Object { $_.'#text' }) -join '') }
        $cells[$column] = $value
      }
      $rows[[int]$row.r] = $cells
    }
    return $rows
  } finally { $zip.Dispose() }
}

function Cell($Rows, [int]$Row, [string]$Column) {
  if ($Rows.ContainsKey($Row) -and $Rows[$Row].ContainsKey($Column)) { return [string]$Rows[$Row][$Column] }
  return ''
}

function Excel-Date([string]$Value) {
  $number = 0.0
  if ([double]::TryParse($Value, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number) -and $number -gt 20000) {
    return [datetime]::FromOADate($number).ToString('yyyy-MM-dd')
  }
  return $Value
}

function Write-CsvUtf8([string]$Name, [object[]]$Records) {
  $path = Join-Path $OutputDirectory $Name
  $Records | Export-Csv -LiteralPath $path -NoTypeInformation -Encoding utf8
  Write-Output "$Name`t$($Records.Count) registros"
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$detailFile = Get-ChildItem -LiteralPath $SourceDirectory -Filter '*.xlsx' | Where-Object { $_.Name -like 'REPORTE DE TALLERES DE PATRULLAS ELECTRICAS*' } | Select-Object -First 1
if (-not $detailFile) { throw 'No se encontró el reporte de ingresos a taller esperado.' }

$rows = Read-XlsxRows $detailFile.FullName
$records = @()
$incomplete = @()
foreach ($row in ($rows.Keys | Sort-Object)) {
  if ($row -le 1 -or -not (Cell $rows $row 'A')) { continue }
  $record = [pscustomobject]@{
    numero_economico = Cell $rows $row 'A'; tipo_unidad = Cell $rows $row 'B'; dependencia = Cell $rows $row 'C'
    tipo_movimiento = Cell $rows $row 'D'; concepto = Cell $rows $row 'E'; descripcion = Cell $rows $row 'F'
    taller_nombre = Cell $rows $row 'G'; fecha_ingreso = Excel-Date (Cell $rows $row 'H')
    tiempo_taller_dias = Cell $rows $row 'I'; estatus = Cell $rows $row 'J'; fecha_salida = Excel-Date (Cell $rows $row 'K')
    observaciones = Cell $rows $row 'L'
  }
  if (-not $record.fecha_ingreso -or -not $record.tipo_movimiento -or -not $record.concepto -or -not $record.taller_nombre -or -not $record.estatus) {
    $incomplete += $record
    continue
  }
  $records += $record
}
Write-CsvUtf8 '01_ingresos_taller_electricas.csv' $records
Write-CsvUtf8 '05_filas_incompletas_para_revision.csv' $incomplete
