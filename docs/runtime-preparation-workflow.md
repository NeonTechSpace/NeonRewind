# Runtime preparation workflow

This workflow prepares the movie-return compatibility probe and collector payload. It does not start the game, install files without explicit commands, or publish private observations.

Read [Movie-return runtime host](movie-return-runtime-host.md) for the lifecycle and ownership rules and [Movie-return runtime observation](movie-return-runtime-observation.md) for the implemented validation case.

[Documentation overview](README.md) · [Previous: domain compilation](domain-compilation-workflow.md)

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

Collector `0.1.7` implements the bounded hooks and observation writer, resolves the inherited inventory function through the customer class hierarchy, scopes inventory reads to active customer returns, and reports bounded target, callable-dispatch, reflected-contract, registration, and callback labels without enumerating unrelated runtime objects. Resolved functions whose callable dispatch is not yet available are retried, while unsupported flag and dispatch combinations fail closed. A customer frame binds its ExampleQueueSystem and pre-ready queue only when the nested movie selector runs, and customer calls that never enter the movie branch produce no movie-return event. Selector post-hooks read Blueprint out-parameters through UE4SS's `FFrame::OutParms` lookup rather than the temporary locals container. A user-operated run for Steam build `23896268` completed and passed the repository's semantic validator. The observation and validation report remain private ignored artifacts. The following command prepares its ignored staging payload without changing the game directory.

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

[Documentation overview](README.md)
