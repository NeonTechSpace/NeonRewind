# Movie-return runtime host

This page explains how NeonRetroRewind temporarily connects a purpose-built probe or collector to the running game.
It is a design and safety reference for the implemented movie-return observation.

[Research overview](research-overview.md) · [Runtime preparation](runtime-preparation-workflow.md) · [Observation design](movie-return-runtime-observation.md)

## Who needs this page

Read this page if you are changing the runtime host, reviewing what it adds to the game directory, or investigating a failed compatibility check.
You do not need it to understand the project, perform static research, or run normal repository tests.

## The design in plain language

Static research studies files while the game is closed.
Runtime research needs a small piece of NeonRetroRewind code to observe selected state while the game is running.

UE4SS is the external runtime host used to load that code.
The first payload is a Lua compatibility probe that checks whether required objects, fields, and functions can be found.
The second payload is a narrow C++ collector that records the before and after states required by the observation.

Neither payload starts the game or controls gameplay.
Installation and cleanup are separate commands that show an exact file list and require approval for that exact list.

## Current status

The probe lifecycle, collector lifecycle, and bounded collector version `0.1.7` are implemented.
A user-operated observation for Steam build `23896268` completed and passed semantic validation.
Its observation, report, and runtime log remain private ignored artifacts.

The Lua probe produces a compatibility diagnostic.
It does not produce a runtime observation or prove that a game rule passed.

## Before reading the implementation details

Read the [research overview](research-overview.md) for the difference between static evidence and a runtime observation.
Read the [movie-return observation](movie-return-runtime-observation.md) for the exact behavior being checked and the limits on collected data.

## Investigation result

The supported game build uses Unreal Engine 5.4.
UE4SS experimental build `3.0.1-1018-g662df915` has already run against that exact executable and produced its mapping.
The verified archive SHA-256 is `caa0f9a6c2ca372c2be5042668b2e86d1cc3bf45fa069a689552314d97f9ee9e`.
This exact archive is the initial runtime host because compatibility with the supported executable is already proven.
Changing UE4SS versions would create a new compatibility question before the collector itself can be tested.

The [UE4SS experimental release notes](https://github.com/UE4SS-RE/RE-UE4SS/releases/tag/experimental-latest) describe Unreal Engine 5.4 support and the current `dwmapi.dll` plus `ue4ss` directory layout.
The [UE4SS installation guide](https://docs.ue4ss.com/dev/installation-guide.html) allows `override.txt` beside the proxy DLL to point to an external UE4SS root.
The proven proxy binary contains that override support.

## First implementation

The first implementation is a source-only Lua compatibility probe named `NeonRetroRewindMovieReturnProbe` under `projects/game-data-exporter/runtime-exporter/Probe`.
It is not the runtime observation collector.
Its output is a private diagnostic report and must not validate as a movie-return runtime observation.

The probe checks only these capabilities:

- Detect the naturally loaded rental manager without loading unrelated packages.
- Detect naturally loaded AI customer objects involved in the movie-return path.
- Resolve the exact rental queues and customer inventory fields needed by the observation contract.
- Read the bounded arrays through their reflected properties.
- Register the exact known movie-readiness, selector, and customer-return function paths.
- Record which hooks fire and which callback phase is available.
- Write a bounded diagnostic JSON file to the ignored local runtime directory.

The probe must not enumerate the complete Unreal object set.
The probe must not force-load packages.
The probe must not write a schema-valid observation or claim that a mechanic passed.

## Why the probe is not the collector

The observation contract requires the exact state immediately before and after the readiness and customer-return transitions.
The [UE4SS `RegisterHook` documentation](https://docs.ue4ss.com/dev/lua-api/global-functions/registerhook.html) states that Blueprint UFunction callbacks run after the function has executed.
That behavior can capture the post-state but cannot guarantee the exact pre-state at the same Blueprint boundary.
A manual snapshot before a gameplay action could race with other game state changes and therefore cannot satisfy the evidence contract.

The typed traces expose generic native array helpers, but those functions are shared across unrelated gameplay and do not provide a purpose-specific boundary.
The compatibility probe does not hook those generic functions.
If the probe confirms the required objects, fields, and Blueprint hook paths, the observation collector requires a narrow UE4SS C++ pre-call and post-call hook.
UE4SS exposes a [C++ modding API](https://github.com/UE4SS-RE/RE-UE4SS) with pre-hook and post-hook support.

The probe separates compatibility evidence from mechanic-validation evidence.
Its result determines whether the observation requires a purpose-specific C++ collector.

## Temporary installation footprint

The runtime host may add only the following files under the game's `RetroRewind\Binaries\Win64` directory:

- `dwmapi.dll`
- `override.txt`

The ignored repository `.local` directory contains the staged `ue4ss` tree, including `UE4SS.dll`, its settings, and its supporting files.
The `override.txt` file contains the absolute path to the staged `ue4ss` directory.
The pinned proxy appends `UE4SS.dll` to that directory path when it loads the runtime host.
The staged UE4SS settings must keep the text console and graphical console disabled.
Hot reload and automatic Lua-mod reload must be disabled.
The enabled-mod list must contain exactly one NeonRetroRewind payload: `NeonRetroRewindMovieReturnProbe` for a probe stage or `NeonRetroRewindMovieReturnCollector` for a collector stage.
The NeonRetroRewind mod source, controlling `mods.txt`, probe diagnostic or collector observation output, and run metadata remain under an ignored repository `.local` directory.
UE4SS must use its documented additional-mod-directory and controlling-mod-list settings to read only the staged NeonRetroRewind payload.

The installation must not use Steam launch arguments.
The installation must not create persistent environment variables.
The installation must not create symbolic links or directory junctions.
The tooling must not launch or close the game or Steam.
The tooling must not move focus or send input.

## Installation approval

The game must be closed before staging or installation checks begin.
The tooling must verify the exact supported executable and build identity.
The tooling must refuse installation if `dwmapi.dll`, `override.txt`, or any proposed target already exists.
The tooling must generate a manifest containing every proposed relative path, byte length, and SHA-256 hash.
The offline `stage-probe` and `stage-collector` commands write that record after applying the runtime exporter's internal contract checks without copying either proposed file.
Collector staging copies the supplied `main.dll`, generated collector config, observation schema, and target movie-return mechanics artifact into ignored local staging.
The collector payload records each file's byte length and SHA-256 hash, the exact game build, the UE4SS version, and the absolute ignored output root.
The generated config follows [`movie-return-runtime-collector-config.schema.json`](../projects/game-data-exporter/schemas/runtime/movie-return-runtime-collector-config.schema.json).
The person using the computer must see that manifest and explicitly approve the copy before any game-directory file is added.
Installation is copy-only and must not replace an existing file.
Running `install-probe` or `install-collector` without an approval hash prints the exact copy list and changes nothing.
Each install command rejects the other payload kind.
An approved run requires the SHA-256 hash of the reviewed staging manifest and writes `runtime-host-installation.json` before copying.
The command can resume only when that installation manifest and any existing targets still match the same approved staging manifest.

The person using the computer launches the game normally after installation.
The person using the computer controls all gameplay, window focus, and shutdown.
The tooling may inspect the private diagnostic report only after the person confirms that the game is closed.

## Cleanup approval

Cleanup must use the exact installation manifest from the approved copy.
The tooling must recalculate every installed file hash after the game has closed.
Cleanup must stop if a file changed, an expected file is missing, or an unowned file exists inside an installed directory.
The person using the computer must see and explicitly approve the exact removal list.
Cleanup may remove only the two game-directory files whose paths and hashes match the installation manifest.
Running `cleanup-probe` or `cleanup-collector` without an approval hash prints that list and changes nothing.
Each cleanup command rejects the other payload kind.
An approved run requires the SHA-256 hash of the reviewed installation manifest, removes the proxy first, and preserves the private installation manifest.

## Decision after the probe

The completed compatibility probe proved the required objects, fields, arrays, Blueprint hook paths, and private output behavior for Steam build `23896268`.
That result leads to a purpose-specific C++ collector using the observation contract because Lua cannot provide the exact Blueprint pre-call state.
The probe's 16-element diagnostic limit does not define the collector limit.
The contract permits at most 256 captured references per collection and requires the collector to record the actual count and whether references were omitted.
If required fields or hooks are unavailable, the collector design must stop and be revised from the diagnostic evidence.
Collector `0.1.7` implements the bounded gameplay hooks and atomic observation writer.
It resolves the local-virtual inventory function by exact name through the already resolved customer class hierarchy, then checks each function against the pinned UE4SS callable-dispatch rules before reflected-parameter validation.
A resolved function with no callable dispatch is retried as load readiness, while an unsupported dispatch and native-flag combination fails closed with a fixed label.
A customer frame starts with only its customer context.
The first nested movie-selection pre-hook supplies the actual ExampleQueueSystem and pre-ready queue before selection or removal.
Calls that do not enter the movie branch are discarded.
It ignores inventory calls outside an active customer-return frame before reading their parameters.
Selector post-hooks resolve both Blueprint out-parameter addresses from `FFrame::OutParms` with UE4SS's exported `FindOutParamValueAddress`, matching the runtime host's own post-hook handling.
It reports exact unresolved-target, dispatch-readiness, reflected-contract, hook-registration, and guarded-callback labels without enumerating unrelated objects.
Native and offline checks establish the build and contracts.
The completed user-operated run establishes the observed in-game path for the pinned build.
