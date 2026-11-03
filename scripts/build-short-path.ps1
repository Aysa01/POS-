$ErrorActionPreference = 'Stop'
$workspacePath = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$workspaceParent = Split-Path -Parent $workspacePath
$workspaceName = Split-Path -Leaf $workspacePath
$cachePath = Join-Path ([System.IO.Path]::GetTempPath()) 'pour-gradle-cache'
New-Item -ItemType Directory -Path $cachePath -Force | Out-Null
$freeDrives = @('P:', 'Q:', 'R:', 'G:', 'H:', 'Z:') | Where-Object { -not (Test-Path -LiteralPath ($_ + '\')) }
if ($freeDrives.Count -lt 2) { throw 'Two unused drive letters are needed for short Windows build paths.' }
$projectDrive = $freeDrives[0]
$cacheDrive = $freeDrives[1]
$previousCache = $env:GRADLE_USER_HOME
$previousSdk = $env:ANDROID_HOME
& subst.exe $projectDrive $workspaceParent
if ($LASTEXITCODE -ne 0) { throw 'Could not create temporary project drive mapping.' }
try {
  & subst.exe $cacheDrive $cachePath
  if ($LASTEXITCODE -ne 0) { throw 'Could not create temporary cache drive mapping.' }
  try {
    $env:GRADLE_USER_HOME = $cacheDrive + '\'
    $mappedProject = $projectDrive + '\' + $workspaceName
    if (Test-Path -LiteralPath ($mappedProject + '\.tools\android-sdk')) { $env:ANDROID_HOME = $mappedProject + '\.tools\android-sdk' }
    & ($mappedProject + '\scripts\build-apk.ps1')
  } finally {
    Set-Location -LiteralPath $workspacePath
    & subst.exe $cacheDrive /D
  }
} finally {
  $env:GRADLE_USER_HOME = $previousCache
  $env:ANDROID_HOME = $previousSdk
  & subst.exe $projectDrive /D
}
