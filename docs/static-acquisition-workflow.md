# Static acquisition workflow

This page shows how to collect focused evidence from the files of a game installation you own.
The game stays closed during the entire workflow.

[Research overview](research-overview.md) · [Tool setup](portable-tool-setup.md) · [Next: Blueprint analysis](blueprint-analysis-workflow.md)

## Who needs this page

Use this workflow only if you want to reproduce or extend NeonRetroRewind's research with your own licensed copy of the game.
You do not need it for normal code changes, tests, or reading the project documentation.

## What you will produce

The first commands identify the exact game build and list which packaged files can be read.
Later commands use a matching Unreal mapping to collect selected values and script locations.

These results are private research artifacts.
They stay in local directories ignored by Git and must not be published.

## Before you start

You need the following items:

- Windows and a licensed Steam installation of *Retro Rewind: Video Store Simulator*.
- The .NET 10 SDK for the commands on this page.
- Node.js `24.19.0` and pnpm `11.x` for the later compilation workflow.
- An internet connection for the first dependency installation unless the packages are already cached.
- A `.usmap` mapping made for the exact game executable before running any step that reads structured values or Blueprint logic.

The [research overview](research-overview.md) explains game builds, packages, mappings, Blueprints, evidence, and artifacts in plain language.
Read it before continuing if any of those terms are unfamiliar.

The recommended setup uses portable tool archives extracted into ignored local directories.
Follow [Portable local tool setup](portable-tool-setup.md) to install nothing system-wide and change `PATH` only for the current shell process.

The repository does not currently generate the `.usmap` mapping.
If you do not already have a matching mapping, you can complete the probe, build-manifest, and static-census steps, then stop.
Do not reuse a mapping from a different game build.

The commands that require the mapping will report that requirement again when you reach them.

Open PowerShell or Git Bash in the repository root and verify the installed tools.

```powershell
dotnet --version
node --version
pnpm --version
```

```bash
dotnet --version
node --version
pnpm --version
```

The expected major versions are .NET `10`, Node.js `24`, and pnpm `11`.
If a command is unavailable, use the official [.NET installation guide](https://learn.microsoft.com/en-us/dotnet/core/install/windows), [Node.js download page](https://nodejs.org/en/download), or [pnpm installation guide](https://pnpm.io/installation).

## Set your local paths

The following example uses Steam's default Windows location.
Change only `$steamRoot` if your Steam library is on another drive or in another folder.

```powershell
$steamRoot = "C:\Program Files (x86)\Steam"
$gameRoot = Join-Path $steamRoot "steamapps\common\RetroRewind"
$steamManifest = Join-Path $steamRoot "steamapps\appmanifest_3552140.acf"
$packageDirectory = Join-Path $gameRoot "RetroRewind\Content\Paks"
$packageFile = Join-Path $packageDirectory "RetroRewind-Windows.pak"
$executable = Join-Path $gameRoot "RetroRewind\Binaries\Win64\RetroRewind-Win64-Shipping.exe"
$extractor = "projects/game-data-exporter/static-extractor/NeonRetroRewind.StaticExtractor.csproj"
$generationId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$buildDirectory = Join-Path (Get-Location) "projects/game-data-exporter/.local/acquisition/runs/$generationId"
$domainDirectory = Join-Path (Get-Location) "projects/typescript/.local/domain/runs/$generationId"

New-Item -ItemType Directory -Force -Path $buildDirectory, $domainDirectory | Out-Null
```

```bash
steamRoot="C:\Program Files (x86)\Steam"
gameRoot="$steamRoot/steamapps\common\RetroRewind"
steamManifest="$steamRoot/steamapps\appmanifest_3552140.acf"
packageDirectory="$gameRoot/RetroRewind\Content\Paks"
packageFile="$packageDirectory/RetroRewind-Windows.pak"
executable="$gameRoot/RetroRewind\Binaries\Win64\RetroRewind-Win64-Shipping.exe"
extractor="projects/game-data-exporter/static-extractor/NeonRetroRewind.StaticExtractor.csproj"
generationId="$(date -u +%Y%m%dT%H%M%SZ)"
buildDirectory="$PWD/projects/game-data-exporter/.local/acquisition/runs/$generationId"
domainDirectory="$PWD/projects/typescript/.local/domain/runs/$generationId"

mkdir -p "$buildDirectory" "$domainDirectory"
```

Each run uses a new generation directory so immutable artifacts can keep stable, unversioned filenames.

Close the game before reading its package files.
The game does not need to be running for any command in this workflow.

Restore the locked .NET dependencies once.

```powershell
dotnet restore $extractor --locked-mode
```

```bash
dotnet restore "$extractor" --locked-mode
```

## 1. Check that the package can be read

The probe opens the package directory and reports how many containers, files, and Unreal packages it can see.
It does not extract game values or create an output file.

```powershell
dotnet run --project $extractor -- $packageDirectory
```

```bash
dotnet run --project "$extractor" -- "$packageDirectory"
```

Continue when the command reports at least one mounted container and a nonzero file and package count.

## 2. Create the build manifest

The build manifest records the Steam application, build number, executable hash, package hash, engine profile, and extractor version.
Later steps use these hashes to make sure their inputs still belong to the same build.

```powershell
dotnet run --project $extractor -- manifest `
  --steam-manifest $steamManifest `
  --executable $executable `
  --package $packageFile `
  --output (Join-Path $buildDirectory "build-manifest.json")
```

```bash
dotnet run --project "$extractor" -- manifest \
  --steam-manifest "$steamManifest" \
  --executable "$executable" \
  --package "$packageFile" \
  --output "$buildDirectory/build-manifest.json"
```

Repeat `--package <path>` if a future build uses more than one package-container file.
The command accepts an identical existing output and refuses to overwrite different content.

## 3. Create the static census

The census inventories the package without needing an Unreal mapping.
It records files, package headers, imports, exports, exported classes, and parse failures.

```powershell
dotnet run --project $extractor -- census `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "static-census.json")
```

```bash
dotnet run --project "$extractor" -- census \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/static-census.json"
```

The command verifies the package hashes before and after scanning.

## 4. Supply the matching Unreal mapping

A `.usmap` file describes the Unreal properties needed to read DataTable rows and similar structured assets.
Set `$mappings` to a mapping produced for the same executable recorded in the build manifest.

```powershell
$mappings = "C:\path\to\the\matching-build.usmap"
```

```bash
mappings="C:\path\to\the\matching-build.usmap"
```

The mapped acquisition commands cannot run reliably without this file.

## 5. Create the structured index

The structured index fully reads candidate DataTables, StringTables, and direct data assets without copying their row values.
It records the table locations, structures, row counts, property counts, and failures.

```powershell
dotnet run --project $extractor -- structured-index `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "structured-asset-index.json")
```

```bash
dotnet run --project "$extractor" -- structured-index \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/structured-asset-index.json"
```

The command validates the manifest, census, mapping, and package identities before and after parsing.

## 6. Extract the structured values

This step copies the indexed DataTable rows and StringTable entries into deterministic JSON.
The output contains game text and must remain in the ignored local acquisition directory.

```powershell
dotnet run --project $extractor -- structured-values `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --structured-index (Join-Path $buildDirectory "structured-asset-index.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "structured-values.json")
```

```bash
dotnet run --project "$extractor" -- structured-values \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --structured-index "$buildDirectory/structured-asset-index.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/structured-values.json"
```

The command verifies every input again after extraction and refuses to overwrite different output.

## 7. Extract the rental-system evidence

This step reads six packages that define the rental manager, its two structs, and three related AI tasks.
It records generated-class fields, function names, class-default values, struct defaults, and object references contained in those mapped defaults.
The command stops if the exact package cluster is absent from the census.

```powershell
dotnet run --project $extractor -- rental-evidence `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "rental-evidence.json")
```

```bash
dotnet run --project "$extractor" -- rental-evidence \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/rental-evidence.json"
```

The output contains extracted game values and must remain in the ignored local acquisition directory.

## 7a. Extract the unlockable-system evidence

This step reads the unlockable manager, its shared item base, its helper class, and its save structure.
It records generated-class fields, function names, class-default values, struct defaults, and object references contained in those mapped defaults.
The command stops if the exact four-package cluster is absent from the census.

```powershell
dotnet run --project $extractor -- unlockable-evidence `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "unlockable-evidence.json")
```

```bash
dotnet run --project "$extractor" -- unlockable-evidence \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/unlockable-evidence.json"
```

The output contains extracted game values and must remain in the ignored local acquisition directory.

## 7b. Extract the statistic evidence

This step reads the statistic manager and its save structure.
It records generated-class fields, function names, class-default values, struct defaults, and object references contained in those mapped defaults.
The command stops if either exact package is absent from the census.

```powershell
dotnet run --project $extractor -- statistic-evidence `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "statistic-evidence.json")
```

```bash
dotnet run --project "$extractor" -- statistic-evidence \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/statistic-evidence.json"
```

The output contains extracted game values and must remain in the ignored local acquisition directory.

## 7c. Extract the gameplay-unlock enum

This step reads the gameplay-unlock user-defined enum selected by a private level-progression target profile.
It records every nonterminal enum value with its internal name and authored display label.
The profile is a build-bound JSON file that records the exact build, mappings, engine, enum, table, function, symbol, and source-locator expectations used by the level-progression workflow.
It must remain under `projects/game-data-exporter/.local/targets` or another ignored local directory.
Its format is defined by `projects/game-data-exporter/schemas/config/level-progression-target-profile.schema.json`.
The command stops if the profile, package, enum shape, build, mappings, or engine configuration differs from the supplied evidence.

Set the private profile path before running the command.

```powershell
$targetProfile = "projects/game-data-exporter/.local/targets/level-progression-target-profile.json"
```

```bash
targetProfile="projects/game-data-exporter/.local/targets/level-progression-target-profile.json"
```

```powershell
dotnet run --project $extractor -- gameplay-unlock-enum `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --mappings $mappings `
  --target-profile $targetProfile `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "gameplay-unlock-enum.json")
```

```bash
dotnet run --project "$extractor" -- gameplay-unlock-enum \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --mappings "$mappings" \
  --target-profile "$targetProfile" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/gameplay-unlock-enum.json"
```

The command verifies the profile, package, and input identities before and after extraction, accepts identical existing output, and refuses to overwrite different content.
The output records the profile filename, byte length, SHA-256 hash, and profile type.
The display labels contain extracted game text, so the artifact must remain in the ignored local acquisition directory.

## 7d. Extract the level-progression category enums

This step reads the movie-category and game-category enums selected by the same private target profile.
It records every nonterminal enum value with its internal name and authored display label.

```powershell
dotnet run --project $extractor -- level-progression-category-enums `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --mappings $mappings `
  --target-profile $targetProfile `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "level-progression-category-enums.json")
```

```bash
dotnet run --project "$extractor" -- level-progression-category-enums \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --mappings "$mappings" \
  --target-profile "$targetProfile" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/level-progression-category-enums.json"
```

The command verifies both enum packages and every input identity before and after extraction.
It accepts identical existing output and refuses to overwrite different content.
The display labels contain extracted game text, so the artifact must remain in the ignored local acquisition directory.

## 7e. Trace the unlock eligibility and mutation functions

This step rereads `BP_ExampleItem_C.IsExampleEligible`, `BP_ExampleItem_C.ApplyExample`, `ExampleUnlockSystem_C.CanApplyExample`, and `ExampleUnlockSystem_C.TryApplyExample` from cooked Kismet bytecode.
It accepts only unlockable evidence for the supplied build and mappings, confirms that each exact class and function remains present, and writes typed calls, branches, variables, literals, assignments, contexts, and returns without parsing decompiler pseudocode.

```powershell
dotnet run --project $extractor -- unlockable-function-trace `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --unlockable-evidence (Join-Path $buildDirectory "unlockable-evidence.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "unlockable-function-trace.json")
```

```bash
dotnet run --project "$extractor" -- unlockable-function-trace \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --unlockable-evidence "$buildDirectory/unlockable-evidence.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/unlockable-function-trace.json"
```

The command verifies every package and input identity before and after tracing, accepts identical existing output, and refuses to overwrite different content.
The output contains extracted game logic and must remain in the ignored local acquisition directory.

## 7f. Discover unlock implementation sites

This step scans every parsed package whose census metadata records a generated Blueprint class.
It resolves Blueprint inheritance from `BP_ExampleItem_C`, records exact `IsExampleEligible` and `ApplyExample` overrides, identifies `ExecuteExampleGraph_ExampleUnlockSystem`, and scans each loaded function once for calls named `CanApplyExample`, `IsExampleEligible`, `ApplyExample`, or `TryApplyExample`.

```powershell
dotnet run --project $extractor -- unlockable-implementation-sites `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --unlockable-evidence (Join-Path $buildDirectory "unlockable-evidence.json") `
  --unlockable-function-trace (Join-Path $buildDirectory "unlockable-function-trace.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "unlockable-implementation-sites.json")
```

```bash
dotnet run --project "$extractor" -- unlockable-implementation-sites \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --unlockable-evidence "$buildDirectory/unlockable-evidence.json" \
  --unlockable-function-trace "$buildDirectory/unlockable-function-trace.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/unlockable-implementation-sites.json"
```

The artifact records complete or partial scan coverage and package failures explicitly.
Function-name call sites are candidates because virtual Kismet calls do not always encode a unique declaring class.
Inheritance and override records use exact class paths.
The command verifies all package and input identities before and after scanning, accepts identical existing output, and refuses to overwrite different content.
The output contains extracted game metadata and must remain in the ignored local acquisition directory.

## 7g. Trace the unlock-manager event graph

This step rereads the one `ExecuteExampleGraph_ExampleUnlockSystem` function recorded by a complete implementation-site scan.
It requires the exact build and mappings, confirms that the discovery artifact has complete coverage and exactly one expected manager event graph, and rechecks that function's path, flags, and bytecode-expression count while producing typed Kismet nodes.

```powershell
dotnet run --project $extractor -- unlockable-manager-trace `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --unlockable-implementation-sites (Join-Path $buildDirectory "unlockable-implementation-sites.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "unlockable-manager-trace.json")
```

```bash
dotnet run --project "$extractor" -- unlockable-manager-trace \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --unlockable-implementation-sites "$buildDirectory/unlockable-implementation-sites.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/unlockable-manager-trace.json"
```

The command verifies every package and input identity before and after tracing, accepts identical existing output, and refuses to overwrite different content.
The output contains extracted game logic and must remain in the ignored local acquisition directory.

## 7h. Discover references to the new-release flag

This step uses the static census to scan every parsed package that exports Blueprint functions.
It finds exact Kismet property-pointer names, classifies each occurrence as a read, write, or metadata reference, and records complete or partial coverage without copying the surrounding function bodies.

```powershell
dotnet run --project $extractor -- blueprint-property-references `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --target-property "ExampleReleaseKind" `
  --output (Join-Path $buildDirectory "blueprint-property-references.new-release-unlock.json")
```

```bash
dotnet run --project "$extractor" -- blueprint-property-references \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --target-property "ExampleReleaseKind" \
  --output "$buildDirectory/blueprint-property-references.new-release-unlock.json"
```

The command verifies every package and input identity before and after scanning, accepts identical existing output, and refuses to overwrite different content.
The output contains game-specific function locations and must remain in the ignored local acquisition directory.

## 7i. Trace discovered property-reference functions

This step accepts only a complete property-reference artifact for the supplied build and mappings.
Each requested function must contain at least one recorded property reference.
The command rereads its cooked bytecode into typed Kismet nodes and rechecks every recorded reference in that function against the trace.
Artifacts containing only selected reader functions retain the existing reader selection rule.
Selecting a function without a read uses the broader recorded-reference selection rule.

```powershell
dotnet run --project $extractor -- blueprint-property-reference-trace `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --property-references (Join-Path $buildDirectory "blueprint-property-references.new-release-unlock.json") `
  --function-path "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C:Return Example Request" `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "blueprint-property-reference-trace.new-release-unlock.json")
```

```bash
dotnet run --project "$extractor" -- blueprint-property-reference-trace \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --property-references "$buildDirectory/blueprint-property-references.new-release-unlock.json" \
  --function-path "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C:Return Example Request" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/blueprint-property-reference-trace.new-release-unlock.json"
```

The command verifies package and input identities before and after tracing, accepts identical existing output, and refuses to overwrite different content.
The output contains extracted game logic and must remain in the ignored local acquisition directory.

## Next step

Continue with [Blueprint analysis](blueprint-analysis-workflow.md) to extract caller bodies and typed Kismet traces.

[Research overview](research-overview.md)
