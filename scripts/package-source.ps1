$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $sourceRoot
New-Item -ItemType Directory -Path 'artifacts' -Force | Out-Null
$sourceEntries = @('src', 'modules', 'tests', 'scripts', 'App.tsx', 'index.ts', 'package.json', 'package-lock.json', 'app.json', 'eas.json', 'tsconfig.json', 'babel.config.js', 'metro.config.js', '.gitignore', 'README.md', 'PRODUCT.md', 'DESIGN.md', 'VALIDATION.md')
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archivePath = Join-Path $sourceRoot 'artifacts/pour-pos-source.zip'
$stream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($entry in $sourceEntries) {
    $item = Get-Item -LiteralPath (Join-Path $sourceRoot $entry) -Force
    $files = if ($item.PSIsContainer) { Get-ChildItem -LiteralPath $item.FullName -File -Recurse -Force } else { @($item) }
    foreach ($file in $files) {
      if ($file.FullName -match '[\\/](build|\.gradle|\.cxx|node_modules)[\\/]') { continue }
      $relative = $file.FullName.Substring($sourceRoot.Length + 1).Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  }
} finally { $archive.Dispose(); $stream.Dispose() }
Get-Item -LiteralPath 'artifacts/pour-pos-source.zip' | Select-Object FullName,Length
