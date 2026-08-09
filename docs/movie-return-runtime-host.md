# Movie-return runtime host

This document records the runtime-host investigation for the first movie-return observation.
The Lua compatibility probe source and approval-gated staging, installation, and cleanup commands exist.
The Lua probe produces a compatibility diagnostic, not a runtime observation.

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
The enabled-mod list must contain only `NeonRetroRewindMovieReturnProbe`.
The NeonRetroRewind mod source, controlling `mods.txt`, diagnostic output, and run metadata remain under an ignored repository `.local` directory.
UE4SS must use its documented additional-mod-directory and controlling-mod-list settings to read only that probe.

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
The offline `stage-probe` command writes that record using [`runtime-host-staging.schema.json`](../projects/game-data-exporter/schemas/runtime/runtime-host-staging.schema.json) without copying either proposed file.
The person using the computer must see that manifest and explicitly approve the copy before any game-directory file is added.
Installation is copy-only and must not replace an existing file.
Running `install-probe` without an approval hash prints the exact copy list and changes nothing.
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
Running `cleanup-probe` without an approval hash prints that list and changes nothing.
An approved run requires the SHA-256 hash of the reviewed installation manifest, removes the proxy first, and preserves the private installation manifest.

## Decision after the probe

The probe is successful only if the diagnostic report proves the required objects, fields, arrays, Blueprint hook paths, and private output behavior.
A successful probe leads to a purpose-specific C++ collector using the observation contract because Lua cannot provide the exact Blueprint pre-call state.
The probe's 16-element diagnostic limit does not define the collector limit. The contract permits at most 256 captured references per collection and requires the collector to record the actual count and whether references were omitted.
If required fields or hooks are unavailable, the collector design must stop and be revised from the diagnostic evidence.
