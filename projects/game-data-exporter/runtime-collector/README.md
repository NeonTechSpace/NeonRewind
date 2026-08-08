# Movie-return runtime collector

This directory contains the source and local build commands for the UE4SS C++ movie-return collector.
The current collector is a load-only scaffold: it does not register gameplay hooks or write an observation.

The build is portable on 64-bit Windows.
Its compiler, linker, CMake, Ninja, Rust toolchain, Windows SDK files, dependency source, and output remain in `projects/game-data-exporter/.local`, which Git ignores.
The setup does not require administrator rights and does not change the registry, machine or user `PATH`, services, Visual Studio, or Windows system directories.

## What the public repository provides

The public repository contains everything NeonRetroRewind owns and can publish for making the mod:

- The collector source in `NeonRetroRewindMovieReturnCollector/src`.
- Its CMake integration.
- The pinned portable-tool manifest and bootstrap commands.
- The commands that retrieve exact dependency revisions and build the baseline and collector.
- Instructions for reproducing the build from an empty local `.local` directory.

The repository does not contain a prepared UE4SS baseline, UEPseudo source or headers, a private RE-UE4SS working copy, compiler caches, built DLLs, game files, or extracted game data.
UEPseudo is a private dependency available only to GitHub accounts with the required Epic Games access, so NeonRetroRewind does not redistribute that dependency or a prepared UE4SS baseline built from it.
Each builder retrieves the pinned dependency through their own authorized account and creates the baseline in ignored local storage.

The mod source itself remains public.
After the collector gains functional hooks, its built DLL must be inspected again before deciding whether that binary can also be published.

## What you need

- 64-bit Windows 10 or newer.
- About 12 GB of free disk space for downloads, extracted tools, dependency source, and build output.
- Git available as `git` in the current shell.
- A GitHub account that can read the private [`Re-UE4SS/UEPseudo`](https://github.com/Re-UE4SS/UEPseudo) repository.
- Acceptance of the [Microsoft Visual Studio license](https://aka.ms/vs/17/release/license.txt), because xwin downloads the Microsoft C/C++ runtime and Windows SDK files into `.local`.
- Internet access for the first setup and source preparation.

You do not need an installed copy of Visual Studio, CMake, Ninja, LLVM, Rust, or the Windows SDK.
The bootstrap prepares exact portable versions under `.local`.

Git itself is a prerequisite because it retrieves and verifies the exact public and private source revisions.
If Git is not already available, download the maintained [Git for Windows/x64 Portable](https://git-scm.com/install/windows) archive and extract it somewhere outside the tracked repository files, such as `projects/game-data-exporter/.local/portable-git`.
Portable Git does not require installation or administrator rights.
Open its `git-bash.exe`, or add its `cmd` directory to `PATH` for only the current PowerShell process:

```powershell
$env:Path = "$PWD\projects\game-data-exporter\.local\portable-git\cmd;$env:Path"
git --version
```

Extracted directory names can differ between Portable Git releases; use the directory that directly contains `cmd\git.exe`.

## 1. Prepare the portable tools

Read the Microsoft license linked above first.
If you accept it, open Windows PowerShell in the repository root and run:

PowerShell:

```powershell
& "projects/game-data-exporter/runtime-collector/Bootstrap-PortableToolchain.ps1" -AcceptMicrosoftLicense
```

This command requires only Windows PowerShell and the Git prerequisite described above.

If Git Bash or another Windows Bash is already available, the equivalent command is:

```bash
bash projects/game-data-exporter/runtime-collector/Bootstrap-PortableToolchain.sh -AcceptMicrosoftLicense
```

The bootstrap downloads exact versions recorded in `portable-toolchain.lock.json`, checks every download against its SHA-256 hash, and extracts everything below `projects/game-data-exporter/.local/runtime-collector/portable`.
Running it again reuses verified downloads and completed tools.

## 2. Prepare the pinned private dependency source

While signed in to GitHub, open [`Re-UE4SS/UEPseudo`](https://github.com/Re-UE4SS/UEPseudo) in a browser first.
If GitHub returns `404`, your account cannot retrieve the required private dependency and the build cannot continue.

The preparation command uses the `git` command from the current shell.
With Git for Windows, its first private-repository request may open a browser for GitHub authorization and retain the resulting credential in your Windows account.
The scripts do not ask you to paste a token, change global Git configuration, or write credentials into the repository.

PowerShell:

```powershell
& "projects/game-data-exporter/runtime-collector/Prepare-Ue4ssSource.ps1"
```

Bash on Windows:

```bash
bash projects/game-data-exporter/runtime-collector/Prepare-Ue4ssSource.sh
```

The source command creates or resumes the ignored local Git working copy, checks out RE-UE4SS commit `662df91503379fc383bc745f7ade795d7b2ca215`, initializes its UEPseudo and patternsleuth submodules, and verifies all three revisions.
No private dependency source is copied into this repository's tracked files.

## 3. Build the collector

PowerShell:

```powershell
& "projects/game-data-exporter/runtime-collector/Build-Collector.ps1"
```

Bash on Windows:

```bash
bash projects/game-data-exporter/runtime-collector/Build-Collector.sh
```

The first build compiles the pinned UE4SS baseline and then the collector.
Ninja keeps the native incremental state in the persistent build directory, and Cargo keeps its Rust build state there as well.
Later builds ask Ninja whether the baseline has pending work; with the same toolchain, dependency revisions, build configuration, and baseline source, changing only collector source compiles and links only the collector's native code.
The upstream Rust integration may still run a quick Cargo freshness check; Cargo reuses its persistent output and does not recompile unchanged Rust crates.
There is no compiler-cache service or background build process to preserve between commands.

To prepare or verify only the persistent baseline without building the collector:

```powershell
& "projects/game-data-exporter/runtime-collector/Build-Collector.ps1" -BaselineOnly
```

```bash
bash projects/game-data-exporter/runtime-collector/Build-Collector.sh -BaselineOnly
```

Local builds use at most six logical processors by default. The memory-heavy Unreal baseline target uses at most four of that limit; the remaining baseline and collector use the full limit.
Nested Rust compilation stays within the outer build limit rather than adding another group of parallel jobs.
To choose an explicit positive limit, pass `-ParallelJobs` through either shell:

```powershell
& "projects/game-data-exporter/runtime-collector/Build-Collector.ps1" -ParallelJobs 4
```

```bash
bash projects/game-data-exporter/runtime-collector/Build-Collector.sh -ParallelJobs 4
```

The build prints the exact `main.dll` path and its SHA-256 hash.
The toolchain lock hash is part of the build-directory name, so changing a pinned toolchain creates a separate baseline instead of mixing incompatible output.
Build output uses the short `projects/game-data-exporter/.local/rc-build` path to remain below Windows' legacy 260-character path limit when CMake creates deeply nested dependency files.

The baseline is rebuilt when its pinned source, build configuration, compiler command, or generated dependency state changes.
Changing `portable-toolchain.lock.json` selects a new build directory and therefore starts a new baseline.
Deleting or damaging the active build directory also requires a new baseline.
Changing only collector source does not invalidate the baseline.

If a build is interrupted, rerun the same build command.
Ninja keeps completed outputs and schedules unfinished or invalid targets again; no manual process or cache cleanup is required.

Building does not copy anything into the game directory.
The DLL must not be installed until the runtime-host staging contract includes its exact path, size, and SHA-256 hash.
