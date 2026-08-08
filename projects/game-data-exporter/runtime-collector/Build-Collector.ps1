[CmdletBinding()]
param(
    [string]$Ue4ssSource = (Join-Path $PSScriptRoot ".local/RE-UE4SS-662df915"),
    [int]$ParallelJobs = 0
)

$ErrorActionPreference = "Stop"
$expectedCommit = "662df91503379fc383bc745f7ade795d7b2ca215"
$resolvedSource = [IO.Path]::GetFullPath($Ue4ssSource)
$buildDirectory = Join-Path $PSScriptRoot ".local/build/Game__Shipping__Win64"
$cmake = Get-Command cmake -ErrorAction Stop
$ninja = Get-Command ninja -ErrorAction Stop
$git = Get-Command git -ErrorAction Stop
$rustc = Get-Command rustc -ErrorAction Stop
$compiler = Get-Command cl -ErrorAction Stop

$cmakeVersionText = & $cmake.Source --version | Select-Object -First 1
$ninjaVersionText = & $ninja.Source --version
$rustVersionText = & $rustc.Source --version
$compilerVersionText = (& $compiler.Source 2>&1 | Out-String)

if ($cmakeVersionText -notmatch "cmake version (?<version>\d+\.\d+\.\d+)") {
    throw "Could not read the CMake version."
}
if ([version]$Matches.version -lt [version]"3.22.0") {
    throw "CMake 3.22 or newer is required. Found $($Matches.version)."
}
if ($compilerVersionText -notmatch "Version (?<version>\d+\.\d+)") {
    throw "Could not read the MSVC compiler version. Run this script from an x64 Visual Studio Developer PowerShell."
}
if ([version]$Matches.version -lt [version]"19.43") {
    throw "MSVC 19.43 or newer is required. Found $($Matches.version)."
}
if ($rustVersionText -notmatch "rustc (?<version>\d+\.\d+\.\d+)") {
    throw "Could not read the Rust compiler version."
}
if ([version]$Matches.version -lt [version]"1.73.0") {
    throw "Rust 1.73 or newer is required. Found $($Matches.version)."
}
if ([string]::IsNullOrWhiteSpace($ninjaVersionText)) {
    throw "Could not read the Ninja version."
}
if (-not (Test-Path -LiteralPath (Join-Path $resolvedSource "CMakeLists.txt"))) {
    throw "Pinned RE-UE4SS source was not found. Run Prepare-Ue4ssSource.ps1 first."
}

$actualCommit = (& $git.Source -C $resolvedSource rev-parse HEAD).Trim()
if ($actualCommit -ne $expectedCommit) {
    throw "RE-UE4SS must be checked out at $expectedCommit."
}

if ($ParallelJobs -le 0) {
    $isCi = $env:CI -eq "true" -or $env:GITHUB_ACTIONS -eq "true"
    $fraction = if ($isCi) { 1.0 } else { 0.5 }
    $ParallelJobs = [Math]::Max(1, [Math]::Floor([Environment]::ProcessorCount * $fraction))
}

New-Item -ItemType Directory -Force -Path $buildDirectory | Out-Null

& $cmake.Source `
    -S $PSScriptRoot `
    -B $buildDirectory `
    -G Ninja `
    -DCMAKE_BUILD_TYPE=Game__Shipping__Win64 `
    "-DNEONREWIND_UE4SS_SOURCE=$resolvedSource"
if ($LASTEXITCODE -ne 0) {
    throw "CMake configuration failed."
}

& $cmake.Source `
    --build $buildDirectory `
    --target NeonRewindMovieReturnCollector `
    --parallel $ParallelJobs
if ($LASTEXITCODE -ne 0) {
    throw "Collector build failed."
}

$artifact = Join-Path $buildDirectory "artifact/NeonRewindMovieReturnCollector/dlls/main.dll"
if (-not (Test-Path -LiteralPath $artifact)) {
    throw "The build completed without producing the expected collector DLL: $artifact"
}

Write-Host "Built collector: $artifact"
Write-Host "Parallel jobs: $ParallelJobs"
