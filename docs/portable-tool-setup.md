# Portable local tool setup

This page prepares the basic software needed to run NeonRetroRewind's research commands on Windows.
It is the first command guide in the research sequence.

[Research overview](research-overview.md) · [Next: static acquisition](static-acquisition-workflow.md)

## Who needs this page

Use this page if you want to run the research tools and do not already have the required versions of .NET, Node.js, and pnpm.
If you only want to read about the project or work with an existing result, you can skip it.

.NET runs the tools that read the game files.
Node.js and pnpm run the tools that validate and convert the collected information.

## What this setup changes

The instructions place local copies of the three tools in directories ignored by Git.
They do not require an installer, administrator access, or a permanent `PATH` change.
A `PATH` is the list of directories Windows searches when you enter a command.

The setup does not read the game or produce research results.
It only prepares the software needed by the next workflow.

## Before you begin

You need:

- 64-bit Windows
- PowerShell or Git Bash
- An internet connection for the downloads
- Enough permission to create ignored files inside your local repository folder

## Download the archives

Download these files from their official release pages.

| Tool | Archive | Version |
|---|---|---|
| [.NET SDK](https://builds.dotnet.microsoft.com/dotnet/Sdk/10.0.302/dotnet-sdk-10.0.302-win-x64.zip) | `dotnet-sdk-10.0.302-win-x64.zip` | `10.0.302` |
| [Node.js](https://nodejs.org/download/release/v24.19.0/node-v24.19.0-win-x64.zip) | `node-v24.19.0-win-x64.zip` | `24.19.0` |
| [pnpm](https://github.com/pnpm/pnpm/releases/download/v11.20.0/pnpm-win32-x64.zip) | `pnpm-win32-x64.zip` | `11.20.0` |

The commands below assume the three archives are in the current user's Downloads directory.

## Verify the downloads

Open PowerShell or Git Bash in the NeonRetroRewind repository root.

```powershell
$downloads = Join-Path $env:USERPROFILE "Downloads"
$dotnetZip = Join-Path $downloads "dotnet-sdk-10.0.302-win-x64.zip"
$nodeZip = Join-Path $downloads "node-v24.19.0-win-x64.zip"
$pnpmZip = Join-Path $downloads "pnpm-win32-x64.zip"

$dotnetHash = (Get-FileHash $dotnetZip -Algorithm SHA512).Hash.ToLowerInvariant()
$nodeHash = (Get-FileHash $nodeZip -Algorithm SHA256).Hash.ToLowerInvariant()
$pnpmHash = (Get-FileHash $pnpmZip -Algorithm SHA256).Hash.ToLowerInvariant()

if ($dotnetHash -ne "7d170ed75fa9af34c00646621d92011dbd71943952e2787cd15df9be78e6452b55dadef34d7eff77b802e6af4959e071a55855ac649afeac70901c3a2a258716") {
  throw "The .NET SDK archive hash does not match."
}

if ($nodeHash -ne "57f71ab3652e797d84acddc79c81cc9ff1c6ddb2a1974cdb83f00fee9bff4c73") {
  throw "The Node.js archive hash does not match."
}

if ($pnpmHash -ne "ea2528bdc3d96a1ff3c35587dc48ca692b39d77f08f26df4adeaaa9eb427024e") {
  throw "The pnpm archive hash does not match."
}
```

```bash
downloads="$USERPROFILE/Downloads"
dotnet_zip="$downloads/dotnet-sdk-10.0.302-win-x64.zip"
node_zip="$downloads/node-v24.19.0-win-x64.zip"
pnpm_zip="$downloads/pnpm-win32-x64.zip"

expected_dotnet_hash="7d170ed75fa9af34c00646621d92011dbd71943952e2787cd15df9be78e6452b55dadef34d7eff77b802e6af4959e071a55855ac649afeac70901c3a2a258716"
expected_node_hash="57f71ab3652e797d84acddc79c81cc9ff1c6ddb2a1974cdb83f00fee9bff4c73"
expected_pnpm_hash="ea2528bdc3d96a1ff3c35587dc48ca692b39d77f08f26df4adeaaa9eb427024e"

[[ "$(sha512sum "$dotnet_zip" | awk '{print $1}')" == "$expected_dotnet_hash" ]] || {
  echo "The .NET SDK archive hash does not match." >&2
  exit 1
}

[[ "$(sha256sum "$node_zip" | awk '{print $1}')" == "$expected_node_hash" ]] || {
  echo "The Node.js archive hash does not match." >&2
  exit 1
}

[[ "$(sha256sum "$pnpm_zip" | awk '{print $1}')" == "$expected_pnpm_hash" ]] || {
  echo "The pnpm archive hash does not match." >&2
  exit 1
}
```

Stop if any hash check fails.

## Extract the tools locally

The destination directories must not already contain another tool version.

```powershell
$dotnetDirectory = "projects/game-data-exporter/.local/dotnet-sdk-10.0.302-win-x64"
$typescriptTools = "projects/typescript/.local/tools"
$pnpmDirectory = Join-Path $typescriptTools "pnpm-11.20.0-win-x64"

New-Item -ItemType Directory -Force -Path $dotnetDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $typescriptTools | Out-Null
New-Item -ItemType Directory -Force -Path $pnpmDirectory | Out-Null

Expand-Archive $dotnetZip -DestinationPath $dotnetDirectory
Expand-Archive $nodeZip -DestinationPath $typescriptTools
Expand-Archive $pnpmZip -DestinationPath $pnpmDirectory
```

```bash
dotnet_directory="projects/game-data-exporter/.local/dotnet-sdk-10.0.302-win-x64"
typescript_tools="projects/typescript/.local/tools"
pnpm_directory="$typescript_tools/pnpm-11.20.0-win-x64"

mkdir -p "$dotnet_directory" "$typescript_tools" "$pnpm_directory"

unzip -q "$dotnet_zip" -d "$dotnet_directory"
unzip -q "$node_zip" -d "$typescript_tools"
unzip -q "$pnpm_zip" -d "$pnpm_directory"
```

Add the local tools to the current shell process only.

```powershell
$nodeDirectory = Join-Path $typescriptTools "node-v24.19.0-win-x64"
$env:PATH = @(
  (Resolve-Path $dotnetDirectory).Path
  (Resolve-Path $nodeDirectory).Path
  (Resolve-Path $pnpmDirectory).Path
  $env:PATH
) -join [IO.Path]::PathSeparator

dotnet --version
node --version
pnpm --version
```

```bash
node_directory="$typescript_tools/node-v24.19.0-win-x64"
export PATH="$(pwd)/$dotnet_directory:$(pwd)/$node_directory:$(pwd)/$pnpm_directory:$PATH"

dotnet --version
node --version
pnpm --version
```

The expected output versions are `.NET 10.0.302`, `Node.js 24.19.0`, and `pnpm 11.20.0`.
Closing the shell removes this `PATH` change.
The extracted tools remain inside ignored local directories and can be deleted when they are no longer needed.

## Game and mapping requirements

The extractor reads package files from a locally installed and licensed copy of *Retro Rewind: Video Store Simulator*.
The game should be closed while the offline commands read its package files.

The structured-index, structured-values, rental-evidence, unlockable-evidence, statistic-evidence, unlockable-function-trace, unlockable-implementation-sites, unlockable-manager-trace, blueprint-property-references, blueprint-property-reference-trace, blueprint-call-candidate-trace, blueprint-call-target-trace, rental-blueprint-bodies, blueprint-call-sites, blueprint-caller-bodies, blueprint-function-trace, and rental-function-trace commands also require a `.usmap` mapping produced for the exact game executable recorded in the build manifest.
NeonRetroRewind does not yet provide a supported mapping-generation procedure.
Complete the probe, build-manifest, and static-census steps, then stop if you do not already have a matching mapping.
Do not reuse a mapping from another build.

Return to the [static acquisition workflow](static-acquisition-workflow.md) after the local tools are available.
