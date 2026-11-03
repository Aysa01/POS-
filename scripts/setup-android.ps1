$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$workspaceRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$toolsRoot = Join-Path $workspaceRoot '.tools'
$sdkRoot = Join-Path $toolsRoot 'android-sdk'
$unpackRoot = Join-Path $toolsRoot 'android-commandline'
$latestRoot = Join-Path $sdkRoot 'cmdline-tools\latest'
$archive = Join-Path $toolsRoot 'android-commandline.zip'
New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $latestRoot 'bin\sdkmanager.bat'))) {
  Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile $archive -UseBasicParsing
  $actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a') { throw 'Android command-line tools checksum mismatch.' }
  Expand-Archive -LiteralPath $archive -DestinationPath $unpackRoot -Force
  New-Item -ItemType Directory -Path (Split-Path -Parent $latestRoot) -Force | Out-Null
  $moveSource = [System.IO.Path]::GetFullPath((Join-Path $unpackRoot 'cmdline-tools'))
  $moveTarget = [System.IO.Path]::GetFullPath($latestRoot)
  foreach ($targetPath in @($moveSource, $moveTarget)) {
    if (-not $targetPath.StartsWith($workspaceRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Tool path escaped the workspace.' }
  }
  Move-Item -LiteralPath $moveSource -Destination $moveTarget
}
$env:ANDROID_HOME = $sdkRoot
# This machine's Java reports simply "21". Google's Windows version parser
# expects a dotted version and otherwise incorrectly rejects this valid JDK.
$env:SKIP_JDK_VERSION_CHECK = '1'
$sdkManager = Join-Path $latestRoot 'bin\sdkmanager.bat'
# Accept the Android SDK component licenses for this local build toolchain.
(1..100 | ForEach-Object { 'y' }) | & $sdkManager --sdk_root=$sdkRoot --licenses
if ($LASTEXITCODE -ne 0) { throw 'Android SDK license setup failed.' }
& $sdkManager --sdk_root=$sdkRoot 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK component installation failed.' }
if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot 'platforms\android-36\android.jar'))) { throw 'Android platform installation is incomplete.' }
Write-Output "Android SDK ready at $sdkRoot"
