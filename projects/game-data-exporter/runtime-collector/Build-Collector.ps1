[CmdletBinding()]
param(
    [string]$Ue4ssSource = (Join-Path $PSScriptRoot "../.local/runtime-collector/source/RE-UE4SS-662df915"),
    [string]$ToolRoot = (Join-Path $PSScriptRoot "../.local/runtime-collector/portable"),
    [int]$ParallelJobs = 0,
    [switch]$BaselineOnly
)

$ErrorActionPreference = "Stop"
$expectedCommit = "662df91503379fc383bc745f7ade795d7b2ca215"
$expectedUnrealCommit = "b2e876da82b17254c04304746341c8fde0ddb37c"
$expectedPatternSleuthCommit = "da8bfe4c5a464be0ef225c2c9a6ccaa2d9284018"
$resolvedSource = [IO.Path]::GetFullPath($Ue4ssSource)
$resolvedToolRoot = [IO.Path]::GetFullPath($ToolRoot)
$lockPath = Join-Path $PSScriptRoot "portable-toolchain.lock.json"
$lock = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json
$lockHash = (Get-FileHash -LiteralPath $lockPath -Algorithm SHA256).Hash.ToLowerInvariant().Substring(0, 12)
$buildDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../.local/rc-build/$lockHash"))

$cmake = Join-Path $resolvedToolRoot "tools/cmake-3.31.6-windows-x86_64/bin/cmake.exe"
$ninja = Join-Path $resolvedToolRoot "tools/ninja-1.12.1/ninja.exe"
$llvmBin = Join-Path $resolvedToolRoot "tools/clang+llvm-19.1.7-x86_64-pc-windows-msvc/bin"
$rustupHome = Join-Path $resolvedToolRoot "rust/rustup"
$cargoHome = Join-Path $resolvedToolRoot "rust/cargo"
$xwinSdk = Join-Path $resolvedToolRoot "xwin-sdk"
$toolchainFile = Join-Path $resolvedSource "cmake/toolchains/xwin-clang-cl-toolchain.cmake"
$git = Get-Command git -ErrorAction Stop

$requiredFiles = @(
    $cmake,
    $ninja,
    (Join-Path $llvmBin "clang-cl.exe"),
    (Join-Path $llvmBin "lld-link.exe"),
    (Join-Path $llvmBin "llvm-rc.exe"),
    (Join-Path $cargoHome "bin/rustc.exe"),
    (Join-Path $cargoHome "bin/cargo.exe"),
    (Join-Path $xwinSdk ".neonretrorewind-complete"),
    $toolchainFile
)
foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $requiredFile)) {
        throw "Required portable file was not found: $requiredFile. Run Bootstrap-PortableToolchain.ps1 and Prepare-Ue4ssSource.ps1 first."
    }
}

$actualCommit = (& $git.Source -C $resolvedSource rev-parse HEAD).Trim()
$actualUnrealCommit = (& $git.Source -C (Join-Path $resolvedSource "deps/first/Unreal") rev-parse HEAD).Trim()
$actualPatternSleuthCommit = (& $git.Source -C (Join-Path $resolvedSource "deps/first/patternsleuth") rev-parse HEAD).Trim()
if ($actualCommit -ne $expectedCommit) {
    throw "RE-UE4SS must be checked out at $expectedCommit."
}
if ($actualUnrealCommit -ne $expectedUnrealCommit) {
    throw "UEPseudo must be checked out at $expectedUnrealCommit."
}
if ($actualPatternSleuthCommit -ne $expectedPatternSleuthCommit) {
    throw "patternsleuth must be checked out at $expectedPatternSleuthCommit."
}

if ($ParallelJobs -eq 0) {
    $ParallelJobs = [Math]::Max(1, [Math]::Min(6, [Environment]::ProcessorCount))
}
if ($ParallelJobs -lt 1) {
    throw "ParallelJobs must be a positive integer."
}
$heavyParallelJobs = [Math]::Min(4, $ParallelJobs)

function Invoke-Checked([string]$Operation, [string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Operation failed with exit code $LASTEXITCODE."
    }
}

function Invoke-CheckedWithOutput([string]$Operation, [string]$Command, [string[]]$Arguments) {
    $lines = [Collections.Generic.List[string]]::new()
    & $Command @Arguments 2>&1 | ForEach-Object {
        $line = $_.ToString()
        Write-Host $line
        $lines.Add($line)
    }
    if ($LASTEXITCODE -ne 0) {
        throw "$Operation failed with exit code $LASTEXITCODE."
    }
    return $lines -join "`n"
}

$savedEnvironment = @{
    Path = $env:Path
    RUSTUP_HOME = $env:RUSTUP_HOME
    CARGO_HOME = $env:CARGO_HOME
    RUSTUP_TOOLCHAIN = $env:RUSTUP_TOOLCHAIN
    XWIN_DIR = $env:XWIN_DIR
    CARGO_BUILD_JOBS = $env:CARGO_BUILD_JOBS
    CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER = $env:CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER
    CMAKE_BUILD_PARALLEL_LEVEL = $env:CMAKE_BUILD_PARALLEL_LEVEL
    LIB = $env:LIB
}

try {
    $env:Path = "$llvmBin;$cargoHome/bin;$(Split-Path $ninja);$(Split-Path $cmake);$($env:Path)"
    $env:RUSTUP_HOME = $rustupHome
    $env:CARGO_HOME = $cargoHome
    $env:RUSTUP_TOOLCHAIN = $lock.rustToolchain
    $env:XWIN_DIR = $xwinSdk
    $env:CARGO_BUILD_JOBS = "1"
    $env:CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER = Join-Path $llvmBin "lld-link.exe"
    $env:CMAKE_BUILD_PARALLEL_LEVEL = $ParallelJobs.ToString()
    $env:LIB = @(
        (Join-Path $xwinSdk "crt/lib/x86_64"),
        (Join-Path $xwinSdk "sdk/lib/um/x86_64"),
        (Join-Path $xwinSdk "sdk/lib/ucrt/x86_64")
    ) -join ";"

    New-Item -ItemType Directory -Force -Path $buildDirectory | Out-Null

    $configureArguments = @(
        "-S", $PSScriptRoot,
        "-B", $buildDirectory,
        "-G", "Ninja",
        "-DCMAKE_BUILD_TYPE=Game__Shipping__Win64",
        "-DCMAKE_TOOLCHAIN_FILE=$toolchainFile",
        "-DNEONRETROREWIND_UE4SS_SOURCE=$resolvedSource"
    )
    Invoke-Checked "CMake configuration" $cmake $configureArguments

    $heavyDryRunOutput = (& $ninja -C $buildDirectory -n Unreal 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Could not inspect the Unreal baseline build graph."
    }
    $heavyBaselineNeeded = $heavyDryRunOutput -notmatch "no work to do"
    $nativeBaselineNeeded = $false
    if ($heavyBaselineNeeded) {
        Write-Host "The pinned Unreal baseline has pending work; compiling it with $heavyParallelJobs parallel jobs."
        $heavyBuildOutput = Invoke-CheckedWithOutput "Unreal baseline build" $cmake @("--build", $buildDirectory, "--target", "Unreal", "--parallel", $heavyParallelJobs)
        $nativeBaselineNeeded = $nativeBaselineNeeded -or ($heavyBuildOutput -match "(?m)^\[\d+/\d+\] (?:Building (?:C|CXX|RC) object|Linking (?:C|CXX) (?:static library|shared library))")
    } else {
        Write-Host "The pinned Unreal baseline is unchanged; skipping its compilation."
    }

    $remainingDryRunOutput = (& $ninja -C $buildDirectory -n UE4SS 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Could not inspect the remaining UE4SS baseline build graph."
    }
    $remainingBaselineNeeded = $remainingDryRunOutput -notmatch "no work to do"
    if ($remainingBaselineNeeded) {
        Write-Host "The UE4SS build graph reports pending checks or work; running it with $ParallelJobs parallel jobs."
        $remainingBuildOutput = Invoke-CheckedWithOutput "Remaining UE4SS baseline build" $cmake @("--build", $buildDirectory, "--target", "UE4SS", "--parallel", $ParallelJobs)
        $nativeBaselineNeeded = $nativeBaselineNeeded -or ($remainingBuildOutput -match "(?m)^\[\d+/\d+\] (?:Building (?:C|CXX|RC) object|Linking (?:C|CXX) (?:static library|shared library))")
    } else {
        Write-Host "The remaining pinned UE4SS baseline is unchanged; skipping its compilation."
    }
    $baselineNeeded = $heavyBaselineNeeded -or $remainingBaselineNeeded

    if ($BaselineOnly) {
        Write-Host "Baseline-only build completed: $buildDirectory"
        Write-Host "Heavy baseline parallel jobs: $heavyParallelJobs"
        Write-Host "Remaining parallel jobs: $ParallelJobs"
        Write-Host "A baseline target command ran this command: $baselineNeeded"
        Write-Host "Native baseline compiled this command: $nativeBaselineNeeded"
        return
    }

    Invoke-Checked "Collector build" $cmake @("--build", $buildDirectory, "--target", "NeonRetroRewindMovieReturnCollector", "--parallel", $ParallelJobs)

    $artifact = Join-Path $buildDirectory "artifact/NeonRetroRewindMovieReturnCollector/dlls/main.dll"
    if (-not (Test-Path -LiteralPath $artifact)) {
        throw "The build completed without producing the expected collector DLL: $artifact"
    }
    $artifactHash = (Get-FileHash -LiteralPath $artifact -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-Host "Built collector: $artifact"
    Write-Host "SHA-256: $artifactHash"
    Write-Host "Heavy baseline parallel jobs: $heavyParallelJobs"
    Write-Host "Remaining parallel jobs: $ParallelJobs"
    Write-Host "A baseline target command ran this command: $baselineNeeded"
    Write-Host "Native baseline compiled this command: $nativeBaselineNeeded"
} finally {
    foreach ($name in $savedEnvironment.Keys) {
        if ($null -eq $savedEnvironment[$name]) {
            Remove-Item -Path "env:$name" -ErrorAction SilentlyContinue
        } else {
            Set-Item -Path "env:$name" -Value $savedEnvironment[$name]
        }
    }
}
