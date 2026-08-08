[CmdletBinding()]
param(
    [string]$SourceDirectory = (Join-Path $PSScriptRoot "../.local/runtime-collector/source/RE-UE4SS-662df915")
)

$ErrorActionPreference = "Stop"
$expectedCommit = "662df91503379fc383bc745f7ade795d7b2ca215"
$expectedUnrealCommit = "b2e876da82b17254c04304746341c8fde0ddb37c"
$expectedPatternSleuthCommit = "da8bfe4c5a464be0ef225c2c9a6ccaa2d9284018"
$resolvedSource = [IO.Path]::GetFullPath($SourceDirectory)
$git = Get-Command git -ErrorAction Stop

if (Test-Path -LiteralPath $resolvedSource) {
    if (-not (Test-Path -LiteralPath (Join-Path $resolvedSource ".git"))) {
        throw "The source destination exists but is not a Git working copy: $resolvedSource"
    }
} else {
    New-Item -ItemType Directory -Force -Path (Split-Path $resolvedSource) | Out-Null
    & $git.Source clone --filter=blob:none --no-checkout https://github.com/UE4SS-RE/RE-UE4SS.git $resolvedSource
    if ($LASTEXITCODE -ne 0) {
        throw "Could not clone RE-UE4SS."
    }
}

& $git.Source -C $resolvedSource fetch --depth 1 origin $expectedCommit
if ($LASTEXITCODE -ne 0) {
    throw "Could not fetch the pinned RE-UE4SS commit."
}

& $git.Source -C $resolvedSource checkout --detach $expectedCommit
if ($LASTEXITCODE -ne 0) {
    throw "Could not check out the pinned RE-UE4SS commit."
}

& $git.Source -C $resolvedSource config submodule.deps/first/Unreal.url https://github.com/Re-UE4SS/UEPseudo.git
& $git.Source -C $resolvedSource config submodule.deps/first/patternsleuth.url https://github.com/trumank/patternsleuth.git
& $git.Source -C $resolvedSource submodule update --init --recursive
if ($LASTEXITCODE -ne 0) {
    throw "Could not initialize the pinned RE-UE4SS submodules. Confirm that this GitHub account can access Re-UE4SS/UEPseudo."
}

$actualCommit = (& $git.Source -C $resolvedSource rev-parse HEAD).Trim()
$actualUnrealCommit = (& $git.Source -C (Join-Path $resolvedSource "deps/first/Unreal") rev-parse HEAD).Trim()
$actualPatternSleuthCommit = (& $git.Source -C (Join-Path $resolvedSource "deps/first/patternsleuth") rev-parse HEAD).Trim()

if ($actualCommit -ne $expectedCommit) {
    throw "The RE-UE4SS source commit does not match the pinned identity."
}
if ($actualUnrealCommit -ne $expectedUnrealCommit) {
    throw "The UEPseudo submodule commit does not match the pinned identity."
}
if ($actualPatternSleuthCommit -ne $expectedPatternSleuthCommit) {
    throw "The patternsleuth submodule commit does not match the pinned identity."
}

Write-Host "Prepared pinned RE-UE4SS source: $resolvedSource"
