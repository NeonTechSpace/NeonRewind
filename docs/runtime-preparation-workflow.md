# Runtime preparation workflow

This page prepares an optional check of movie-return behavior while a person plays the game.
Use it only after static research has produced the movie-return record that the observation will test.

[Research overview](research-overview.md) · [Previous: domain compilation](domain-compilation-workflow.md) · [Observation design](movie-return-runtime-observation.md)

## Who needs this page

This workflow is for contributors reproducing the implemented movie-return runtime observation.
Most NeonRetroRewind research does not need runtime access.

The first prepared payload is a compatibility probe.
It checks whether the runtime host can find the required game objects and functions.
It does not claim that the movie-return rule passed.

The second payload is the collector.
It records only the selected state changes needed by the movie-return observation contract.

## Before you start

You need:

- A completed private build manifest for the supported game build
- A compiled private movie-return mechanics record
- The exact supported UE4SS archive
- A locally built collector when preparing the collector payload
- The game closed during every staging, installation, and cleanup command

UE4SS is the runtime host that loads the purpose-built NeonRetroRewind probe or collector into the game process.
Read [Movie-return runtime host](movie-return-runtime-host.md) for its file lifecycle, safety boundaries, and approval rules.
Read [Movie-return runtime observation](movie-return-runtime-observation.md) for what the collector is allowed to record and what the result can prove.

## What the commands do

The staging commands prepare ignored local files and record their exact hashes.
The install commands first show an exact copy plan and change nothing until the person using the computer approves that plan by hash.

The tooling does not start the game, play the game, publish private observations, or install files without the explicit approval command.

## Prepare the runtime compatibility probe

This command verifies the game executable against the supplied private build manifest and checks the exact UE4SS archive before creating an ignored local staging directory.
It checks that the game is closed and that neither proposed game-directory file already exists.
It does not copy anything into the game directory.

Set the paths to the private inputs and choose a new staging directory.

```powershell
$runtimeExporter = "projects/game-data-exporter/runtime-exporter/NeonRetroRewind.RuntimeExporter.csproj"
$ue4ssArchive = "C:\path\to\zDEV-UE4SS_v3.0.1-1018-g662df915.zip"
$probeScript = "projects/game-data-exporter/runtime-exporter/Probe/NeonRetroRewindMovieReturnProbe/Scripts/main.lua"
$runtimeStageId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$runtimeStage = "projects/game-data-exporter/.local/runtime-host/runs/$runtimeStageId/probe"

New-Item -ItemType Directory -Force -Path (Split-Path $runtimeStage) | Out-Null
```

```bash
runtimeExporter="projects/game-data-exporter/runtime-exporter/NeonRetroRewind.RuntimeExporter.csproj"
ue4ssArchive="C:\path\to\zDEV-UE4SS_v3.0.1-1018-g662df915.zip"
probeScript="projects/game-data-exporter/runtime-exporter/Probe/NeonRetroRewindMovieReturnProbe/Scripts/main.lua"
runtimeStageId="$(date -u +%Y%m%dT%H%M%SZ)"
runtimeStage="projects/game-data-exporter/.local/runtime-host/runs/$runtimeStageId/probe"

mkdir -p "$(dirname "$runtimeStage")"
```

Run the staging command while the game is closed.

```powershell
dotnet run --project $runtimeExporter -- stage-probe `
  --ue4ss-archive $ue4ssArchive `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --game-executable $executable `
  --probe-script $probeScript `
  --output $runtimeStage
```

```bash
dotnet run --project "$runtimeExporter" -- stage-probe \
  --ue4ss-archive "$ue4ssArchive" \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --game-executable "$executable" \
  --probe-script "$probeScript" \
  --output "$runtimeStage"
```

Review `runtime-host-staging.json` in the new staging directory.
It identifies the private inputs and lists the exact size and SHA-256 hash of the proposed `dwmapi.dll` and `override.txt` files.

Preview installation while the game is closed.

```powershell
$stagingManifest = Join-Path $runtimeStage "runtime-host-staging.json"

dotnet run --project $runtimeExporter -- install-probe `
  --staging-manifest $stagingManifest
```

```bash
stagingManifest="$runtimeStage/runtime-host-staging.json"

dotnet run --project "$runtimeExporter" -- install-probe \
  --staging-manifest "$stagingManifest"
```

The preview prints both source and destination paths, byte lengths, file hashes, and the staging-manifest hash.
It exits with code `5` because approval was not supplied, and it does not copy either file.

Review the output, copy the displayed staging-manifest hash into `$approvedStagingSha256`, and rerun only when you approve that exact list.

```powershell
$approvedStagingSha256 = "paste-the-reviewed-staging-manifest-sha256"

dotnet run --project $runtimeExporter -- install-probe `
  --staging-manifest $stagingManifest `
  --approve-staging-sha256 $approvedStagingSha256
```

```bash
approvedStagingSha256="paste-the-reviewed-staging-manifest-sha256"

dotnet run --project "$runtimeExporter" -- install-probe \
  --staging-manifest "$stagingManifest" \
  --approve-staging-sha256 "$approvedStagingSha256"
```

The approved command creates `runtime-host-installation.json` in the staging directory before copying the two files.
It refuses existing targets unless it is resuming the same manifest after an interrupted installation.
The tooling does not launch the game or Steam.

After using the probe, close the game before previewing cleanup.

```powershell
$installationManifest = Join-Path $runtimeStage "runtime-host-installation.json"

dotnet run --project $runtimeExporter -- cleanup-probe `
  --installation-manifest $installationManifest
```

```bash
installationManifest="$runtimeStage/runtime-host-installation.json"

dotnet run --project "$runtimeExporter" -- cleanup-probe \
  --installation-manifest "$installationManifest"
```

The cleanup preview recalculates both installed file hashes and exits with code `5` without removing anything.
Review the exact removal list, copy the displayed installation-manifest hash into `$approvedInstallationSha256`, and rerun only when you approve that exact list.

```powershell
$approvedInstallationSha256 = "paste-the-reviewed-installation-manifest-sha256"

dotnet run --project $runtimeExporter -- cleanup-probe `
  --installation-manifest $installationManifest `
  --approve-installation-sha256 $approvedInstallationSha256
```

```bash
approvedInstallationSha256="paste-the-reviewed-installation-manifest-sha256"

dotnet run --project "$runtimeExporter" -- cleanup-probe \
  --installation-manifest "$installationManifest" \
  --approve-installation-sha256 "$approvedInstallationSha256"
```

Cleanup removes `dwmapi.dll` first and then removes `override.txt`.
It stops before removal if the game is running, either file is missing, or either path or hash differs from the installation manifest.
The ignored installation manifest remains as the local record of the approved copy.

## Prepare the collector payload contract

The collector staging command uses the same verified UE4SS archive, game executable, two-file game footprint, and approval boundary as the probe.
It additionally copies a source-built `main.dll`, the observation schema, and one exact `movie-return-mechanics.json` into ignored local staging and generates a closed collector config.
The staging manifest binds all of those inputs by byte length and SHA-256 hash.

Collector `0.1.7` implements the bounded movie-return hooks and observation writer.
A user-operated run for Steam build `23896268` completed and passed the repository's semantic validator.
The observation and validation report remain private ignored artifacts.
The [collector build guide](../projects/game-data-exporter/runtime-collector/README.md#implementation-details) records the lower-level hook behavior.

The following command prepares the ignored staging payload without changing the game directory.

```powershell
$collectorDll = "projects/game-data-exporter/.local/rc-build/<build-id>/artifact/NeonRetroRewindMovieReturnCollector/dlls/main.dll"
$observationSchema = "projects/game-data-exporter/schemas/runtime/movie-return-observation.schema.json"
$targetMechanics = Join-Path $domainDirectory "movie-return-mechanics.json"
$observationOutputRoot = "projects/game-data-exporter/.local/runtime"
$collectorStage = "projects/game-data-exporter/.local/runtime-host/runs/$runtimeStageId/collector"

New-Item -ItemType Directory -Force -Path $observationOutputRoot | Out-Null

dotnet run --project $runtimeExporter -- stage-collector `
  --ue4ss-archive $ue4ssArchive `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --game-executable $executable `
  --collector-dll $collectorDll `
  --observation-schema $observationSchema `
  --target-mechanics $targetMechanics `
  --observation-output-root $observationOutputRoot `
  --output $collectorStage
```

```bash
collectorDll="projects/game-data-exporter/.local/rc-build/<build-id>/artifact/NeonRetroRewindMovieReturnCollector/dlls/main.dll"
observationSchema="projects/game-data-exporter/schemas/runtime/movie-return-observation.schema.json"
targetMechanics="$domainDirectory/movie-return-mechanics.json"
observationOutputRoot="projects/game-data-exporter/.local/runtime"
collectorStage="projects/game-data-exporter/.local/runtime-host/runs/$runtimeStageId/collector"

mkdir -p "$observationOutputRoot"

dotnet run --project "$runtimeExporter" -- stage-collector \
  --ue4ss-archive "$ue4ssArchive" \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --game-executable "$executable" \
  --collector-dll "$collectorDll" \
  --observation-schema "$observationSchema" \
  --target-mechanics "$targetMechanics" \
  --observation-output-root "$observationOutputRoot" \
  --output "$collectorStage"
```

`install-collector` and `cleanup-collector` use the same preview and exact-manifest approval options as the probe commands.
They accept only collector staging manifests, while the probe commands accept only probe manifests.

[Research overview](research-overview.md) · [Observation design](movie-return-runtime-observation.md)
