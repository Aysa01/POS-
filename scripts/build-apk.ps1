param([string]$Architectures = 'arm64-v8a,x86_64')
$ErrorActionPreference = 'Stop'
$env:NODE_ENV = 'production'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (-not $env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME = Join-Path ([System.IO.Path]::GetTempPath()) 'pour-gradle-cache' }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
  throw 'Dependencies are missing. Run npm install, then npx expo install --fix first.'
}
if (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath $env:ANDROID_HOME)) {
  throw 'Set ANDROID_HOME to an installed Android SDK (install Android Studio and its SDK tools first).'
}
& npm.cmd run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Type checking failed.' }
& npm.cmd test
if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
& npx.cmd expo prebuild --platform android
if ($LASTEXITCODE -ne 0) { throw 'Native project generation failed.' }
# Release bundles JavaScript into the APK; no Metro server is needed to run it.
# The default Expo release uses the generated development keystore. Keep it for
# compatible test updates. Production signing is a separate EAS production build.
# OneDrive placeholders in stale packaging outputs cannot reliably be removed by Java.
# Clear only these generated folders; keep the signing key and published artifacts.
foreach ($packagingRelativePath in @('android\app\build\intermediates\incremental\packageRelease', 'android\app\build\outputs\apk\release', 'android\app\build\intermediates\incremental\release', 'android\app\build\intermediates\merged_res_blame_folder\release', 'android\app\build\intermediates\packaged_res\release', 'android\app\build\intermediates\merged_res\release', 'node_modules\expo\node_modules\expo-constants\android\build\generated\assets\expo-constants', 'node_modules\expo-constants\android\build\generated\assets\expo-constants')) {
  $packagingPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $packagingRelativePath))
  if (-not $packagingPath.StartsWith($projectRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Packaging cleanup escaped the project directory.' }
  if (Test-Path -LiteralPath $packagingPath) { Remove-Item -LiteralPath $packagingPath -Recurse -Force -ErrorAction Stop }
}
Push-Location -LiteralPath (Join-Path $projectRoot 'android')
try {
  & .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures" --max-workers=4 --no-daemon '-Dorg.gradle.vfs.watch=false' '-Pkotlin.incremental=false' '-Pkotlin.compiler.execution.strategy=in-process'
  if ($LASTEXITCODE -ne 0) { throw 'Gradle APK build failed.' }
} finally { Pop-Location }
$apk = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path -LiteralPath $apk)) { throw 'Gradle did not produce the expected APK.' }
$artifacts = Join-Path $projectRoot 'artifacts'
New-Item -ItemType Directory -Path $artifacts -Force | Out-Null
Copy-Item -LiteralPath $apk -Destination (Join-Path $artifacts 'pour-pos.apk')
Get-FileHash -LiteralPath (Join-Path $artifacts 'pour-pos.apk') -Algorithm SHA256
Write-Output 'APK created: artifacts\pour-pos.apk. Preserve the package name and signing key for future updates.'
