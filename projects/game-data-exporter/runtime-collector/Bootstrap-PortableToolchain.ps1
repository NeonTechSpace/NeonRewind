[CmdletBinding()]
param(
    [switch]$AcceptMicrosoftLicense,
    [string]$ToolRoot = (Join-Path $PSScriptRoot "../.local/runtime-collector/portable")
)

$ErrorActionPreference = "Stop"
$resolvedToolRoot = [IO.Path]::GetFullPath($ToolRoot)
$lockPath = Join-Path $PSScriptRoot "portable-toolchain.lock.json"
$lock = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json
$downloadDirectory = Join-Path $resolvedToolRoot "downloads"
$toolsDirectory = Join-Path $resolvedToolRoot "tools"
$rustupHome = Join-Path $resolvedToolRoot "rust/rustup"
$cargoHome = Join-Path $resolvedToolRoot "rust/cargo"
$xwinSdk = Join-Path $resolvedToolRoot "xwin-sdk"
$xwinCache = Join-Path $resolvedToolRoot "xwin-cache"
$xwinComplete = Join-Path $xwinSdk ".neonretrorewind-complete"

if (-not (Test-Path -LiteralPath $xwinComplete) -and -not $AcceptMicrosoftLicense) {
    throw "The portable Windows SDK requires acceptance of Microsoft's license. Read https://aka.ms/vs/17/release/license.txt, then rerun with -AcceptMicrosoftLicense if you accept it."
}

function Assert-Success([string]$Operation) {
    if ($LASTEXITCODE -ne 0) {
        throw "$Operation failed with exit code $LASTEXITCODE."
    }
}

function Write-Phase([string]$Message) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message"
}

function Get-Asset([string]$Name) {
    $asset = $lock.assets.$Name
    if ($null -eq $asset) {
        throw "The toolchain lock does not define asset '$Name'."
    }
    return $asset
}

function Get-VerifiedDownload([string]$Name) {
    $asset = Get-Asset $Name
    $destination = Join-Path $downloadDirectory $asset.file
    $expectedHash = $asset.sha256.ToLowerInvariant()

    if (Test-Path -LiteralPath $destination) {
        Write-Phase "Verifying cached $Name download."
        $actualHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -ne $expectedHash) {
            throw "Existing download has the wrong SHA-256 hash: $destination"
        }
        Write-Phase "Cached $Name download passed SHA-256 verification."
        return $destination
    }

    $partial = "$destination.part"
    Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue
    Write-Phase "Downloading $Name from $($asset.url)"
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($null -ne $curl) {
        & $curl.Source --fail --location --retry 3 --output $partial $asset.url
        Assert-Success "Downloading $Name"
    } else {
        Invoke-WebRequest -Uri $asset.url -OutFile $partial -UseBasicParsing
    }

    $actualHash = (Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $expectedHash) {
        Remove-Item -LiteralPath $partial -Force
        throw "Downloaded $Name has the wrong SHA-256 hash. The incomplete file was removed."
    }
    Move-Item -LiteralPath $partial -Destination $destination
    Write-Phase "Downloaded $Name and verified its SHA-256 hash."
    return $destination
}

function Reset-LocalDirectory([string]$Path) {
    $resolvedPath = [IO.Path]::GetFullPath($Path)
    $rootPrefix = $resolvedToolRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $resolvedPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to replace a directory outside the portable tool root: $resolvedPath"
    }
    if (Test-Path -LiteralPath $resolvedPath) {
        Remove-Item -LiteralPath $resolvedPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $resolvedPath | Out-Null
}

function Expand-ZipAsset([string]$Name, [string]$Destination) {
    $archive = Get-VerifiedDownload $Name
    Write-Phase "Extracting $Name to $Destination"
    Reset-LocalDirectory $Destination
    Expand-Archive -LiteralPath $archive -DestinationPath $Destination
    Write-Phase "Finished extracting $Name."
}

New-Item -ItemType Directory -Force -Path $downloadDirectory, $toolsDirectory | Out-Null

$cmakeRoot = Join-Path $toolsDirectory "cmake-3.31.6-windows-x86_64"
$cmake = Join-Path $cmakeRoot "bin/cmake.exe"
if (-not (Test-Path -LiteralPath $cmake)) {
    $cmakeStaging = Join-Path $toolsDirectory "cmake-staging"
    Expand-ZipAsset "cmake" $cmakeStaging
    if (Test-Path -LiteralPath $cmakeRoot) {
        Reset-LocalDirectory $cmakeRoot
        Remove-Item -LiteralPath $cmakeRoot -Force
    }
    Move-Item -LiteralPath (Join-Path $cmakeStaging "cmake-3.31.6-windows-x86_64") -Destination $cmakeRoot
    Remove-Item -LiteralPath $cmakeStaging -Recurse -Force
} else {
    Write-Phase "CMake is already extracted."
}

$ninjaRoot = Join-Path $toolsDirectory "ninja-1.12.1"
$ninja = Join-Path $ninjaRoot "ninja.exe"
if (-not (Test-Path -LiteralPath $ninja)) {
    Expand-ZipAsset "ninja" $ninjaRoot
} else {
    Write-Phase "Ninja is already extracted."
}

$llvmRoot = Join-Path $toolsDirectory "clang+llvm-19.1.7-x86_64-pc-windows-msvc"
$clang = Join-Path $llvmRoot "bin/clang-cl.exe"
if (-not (Test-Path -LiteralPath $clang)) {
    $llvmArchive = Get-VerifiedDownload "llvm"
    $llvmStaging = Join-Path $toolsDirectory "llvm-staging"
    Reset-LocalDirectory $llvmStaging
    Write-Phase "Extracting LLVM to $llvmStaging. This is the longest archive extraction."
    Push-Location $llvmStaging
    try {
        & $cmake -E tar xJf $llvmArchive
        Assert-Success "Extracting LLVM"
    } finally {
        Pop-Location
    }
    if (Test-Path -LiteralPath $llvmRoot) {
        Reset-LocalDirectory $llvmRoot
        Remove-Item -LiteralPath $llvmRoot -Force
    }
    Move-Item -LiteralPath (Join-Path $llvmStaging "clang+llvm-19.1.7-x86_64-pc-windows-msvc") -Destination $llvmRoot
    Remove-Item -LiteralPath $llvmStaging -Recurse -Force
    Write-Phase "Finished extracting LLVM."
} else {
    Write-Phase "LLVM is already extracted."
}

$xwinRoot = Join-Path $toolsDirectory "xwin-0.9.0-x86_64-pc-windows-msvc"
$xwin = Join-Path $xwinRoot "xwin.exe"
if (-not (Test-Path -LiteralPath $xwin)) {
    $xwinArchive = Get-VerifiedDownload "xwin"
    $xwinStaging = Join-Path $toolsDirectory "xwin-staging"
    Reset-LocalDirectory $xwinStaging
    Write-Phase "Extracting xwin to $xwinStaging."
    Push-Location $xwinStaging
    try {
        & $cmake -E tar xzf $xwinArchive
        Assert-Success "Extracting xwin"
    } finally {
        Pop-Location
    }
    if (Test-Path -LiteralPath $xwinRoot) {
        Reset-LocalDirectory $xwinRoot
        Remove-Item -LiteralPath $xwinRoot -Force
    }
    Move-Item -LiteralPath (Join-Path $xwinStaging "xwin-0.9.0-x86_64-pc-windows-msvc") -Destination $xwinRoot
    Remove-Item -LiteralPath $xwinStaging -Recurse -Force
    Write-Phase "Finished extracting xwin."
} else {
    Write-Phase "xwin is already extracted."
}

$rustupInit = Get-VerifiedDownload "rustup"
$previousRustupHome = $env:RUSTUP_HOME
$previousCargoHome = $env:CARGO_HOME
try {
    $env:RUSTUP_HOME = $rustupHome
    $env:CARGO_HOME = $cargoHome
    $rustup = Join-Path $cargoHome "bin/rustup.exe"
    if (-not (Test-Path -LiteralPath $rustup)) {
        Write-Phase "Preparing isolated Rust $($lock.rustToolchain) under $cargoHome."
        & $rustupInit -y --no-modify-path --profile minimal --default-toolchain $lock.rustToolchain
        Assert-Success "Preparing portable Rust"
    } else {
        Write-Phase "Portable rustup is already prepared."
    }
    & $rustup set auto-self-update disable
    Assert-Success "Disabling rustup self-update"
    Write-Phase "Verifying pinned Rust toolchain $($lock.rustToolchain)."
    & $rustup toolchain install $lock.rustToolchain --profile minimal
    Assert-Success "Verifying portable Rust $($lock.rustToolchain)"
    Write-Phase "Verifying the Rust Windows target."
    & $rustup target add x86_64-pc-windows-msvc --toolchain $lock.rustToolchain
    Assert-Success "Preparing the Rust Windows target"
    Write-Phase "Portable Rust is ready."
} finally {
    $env:RUSTUP_HOME = $previousRustupHome
    $env:CARGO_HOME = $previousCargoHome
}

if (-not (Test-Path -LiteralPath $xwinComplete)) {
    Reset-LocalDirectory $xwinSdk
    Write-Phase "Downloading and arranging the Microsoft C/C++ runtime and Windows SDK files with xwin."
    & $xwin --accept-license --cache-dir $xwinCache splat --output $xwinSdk
    Assert-Success "Preparing the portable Windows SDK files"
    New-Item -ItemType File -Path $xwinComplete | Out-Null
    Write-Phase "Portable Microsoft runtime and SDK files are ready."
} else {
    Write-Phase "Portable Microsoft runtime and SDK files are already prepared."
}

$requiredFiles = @(
    $cmake,
    $ninja,
    $clang,
    (Join-Path $llvmRoot "bin/lld-link.exe"),
    (Join-Path $llvmRoot "bin/llvm-rc.exe"),
    (Join-Path $cargoHome "bin/rustc.exe"),
    (Join-Path $cargoHome "bin/cargo.exe"),
    $xwinComplete
)
foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $requiredFile)) {
        throw "Portable setup is incomplete; expected file was not found: $requiredFile"
    }
}

Write-Phase "Portable toolchain is ready under: $resolvedToolRoot"
Write-Host "No machine PATH, registry, service, or system directory was changed."
