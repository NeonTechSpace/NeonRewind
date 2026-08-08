# Movie-return runtime collector

This directory contains the source and build entry points for the UE4SS C++ movie-return collector.
The current collector is a load-only scaffold.
It does not register gameplay hooks or write an observation yet.

## Pinned dependency

The collector builds against RE-UE4SS commit `662df91503379fc383bc745f7ade795d7b2ca215`.
That is the source commit used by the proven runtime host `3.0.1-1018-g662df915`.
The preparation script also verifies the exact UEPseudo and patternsleuth submodule commits.
Dependency source and build output stay under this directory's ignored `.local` directory.

## Optional Windows build requirements

The pinned RE-UE4SS source requires:

- Windows.
- Visual Studio 2022 version 17.13 or newer with the Desktop development with C++ workload.
- MSVC toolset 14.43 or newer.
- CMake 3.22 or newer.
- Ninja.
- Rust 1.73 or newer.
- Git.
- A GitHub account linked to an Epic Games account with access to `Re-UE4SS/UEPseudo`.

## Prepare the exact UE4SS source

Open an x64 Visual Studio Developer PowerShell in the repository root. For Bash, run `bash` from that Developer PowerShell so the MSVC environment is retained.

```powershell
& "projects/game-data-exporter/runtime-collector/Prepare-Ue4ssSource.ps1"
```

```bash
bash projects/game-data-exporter/runtime-collector/Prepare-Ue4ssSource.sh
```

The script creates or resumes the ignored local Git working copy, checks out the pinned commit, initializes its two submodules, and verifies all three revisions.
It does not change global Git configuration.

## Build the load-only collector

Run the build entry point from the same Developer PowerShell or its Git Bash session.

```powershell
& "projects/game-data-exporter/runtime-collector/Build-Collector.ps1"
```

```bash
bash projects/game-data-exporter/runtime-collector/Build-Collector.sh
```

Local builds use half of the available logical processors by default.
Pass `-ParallelJobs` in PowerShell or set `PARALLEL_JOBS` in Bash to choose an explicit positive limit.

The expected artifact is:

```text
projects/game-data-exporter/runtime-collector/.local/build/Game__Shipping__Win64/artifact/NeonRewindMovieReturnCollector/dlls/main.dll
```

Building does not copy anything into the game directory.
The DLL must not be installed until the runtime-host staging contract includes its exact path, size, and SHA-256 hash.
