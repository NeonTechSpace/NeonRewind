# NeonRetroRewind

NeonRetroRewind is an unofficial, open-source project for *Retro Rewind: Video Store Simulator*.
It currently reads data from an installed Steam copy of the game, converts the film tables into a consistent JSON catalog, and compiles normalized rental, fee, and return mechanics.
The public guide, calculators, and website have not been built yet.

## Data and distribution boundary

The repository contains source code, JSON Schemas, normalization logic, and instructions.
Users provide their own licensed game installation and run the acquisition commands locally.

Do not commit or publish:

- Compiled extractor binaries
- Game binaries, package files, mappings, or saves
- Build manifests or static censuses produced from a game installation
- Structured values, rental or unlockable evidence, Blueprint pseudocode, or Blueprint function traces
- Compiled film catalogs, mechanic artifacts, runtime observations, validation reports, or extracted game text
- Extracted or modified game assets

The documented output directories are ignored by Git.

## What the current workflow does

The commands form one pipeline, and each command uses the file produced by the previous command.

| Step | Result | Meaning |
|---|---|---|
| Build manifest | `build-manifest.json` | Identifies the exact Steam build and package hashes |
| Static census | `static-census.json` | Lists files, Unreal packages, and exported classes |
| Structured index | `structured-asset-index.json` | Locates DataTables and StringTables using a matching Unreal mapping |
| Structured values | `structured-values.json` | Extracts table rows and strings into deterministic JSON |
| Rental evidence | `rental-evidence.json` | Extracts the rental subsystem's fields, functions, explicit defaults, and default-value object references |
| Unlockable evidence | `unlockable-evidence.json` | Extracts the unlockable subsystem's fields, functions, explicit defaults, and default-value object references |
| Unlockable function trace | `unlockable-function-trace.json` | Converts the four unlock eligibility and mutation functions into typed Kismet nodes tied to the unlockable evidence |
| Unlockable implementation sites | `unlockable-implementation-sites.json` | Scans generated Blueprint classes for item-base descendants, hook overrides, manager event graphs, and calls to the four traced hooks |
| Unlockable manager trace | `unlockable-manager-trace.json` | Converts the one discovered unlock-manager event graph into typed Kismet nodes tied to the complete implementation-site scan |
| Rental Blueprint bodies | `rental-blueprint-bodies.json` | Decompiles the rental subsystem's cooked Blueprint bytecode into reviewable pseudocode |
| Blueprint call sites | `blueprint-call-sites.movie-return.json` | Searches parsed Blueprint bytecode for calls to the movie-return selector |
| Blueprint caller bodies | `blueprint-caller-bodies.movie-return.json` | Decompiles the exact functions found by the movie-return call-site scan |
| Customer entry call sites | `blueprint-call-sites.movie-customer-entry.json` | Searches parsed Blueprint bytecode for calls into the discovered movie-customer function |
| Customer event-graph body | `blueprint-caller-bodies.movie-customer-entry.json` | Decompiles the event-graph function that invokes the movie-customer function |
| AI client ubergraph call sites | `blueprint-call-sites.ai-client-ubergraph.json` | Finds Blueprint wrappers that enter the AI client event graph |
| AI client wrapper bodies | `blueprint-caller-bodies.ai-client-ubergraph.json` | Decompiles those wrappers to recover their numeric event-graph entry points |
| Blueprint function trace | `blueprint-function-trace.movie-customer.json` | Converts the linked caller functions into typed Kismet nodes with branch-variable identities |
| Rental function trace | `rental-function-trace.movie-return.json` | Converts selected rental functions into typed Kismet nodes tied to the rental-body artifact |
| Console return mechanics | `console-return-mechanics.json` | Normalizes console-return eligibility and queue movement with source locators |
| Membership fee mechanics | `membership-fee-mechanics.json` | Normalizes membership fee storage, accumulation, and removal with source locators |
| Movie return mechanics | `movie-return-mechanics.json` | Normalizes movie readiness, weighted selection, and customer flow from typed traces |
| New-release unlock mechanics | `new-release-unlock-mechanics.json` | Normalizes the confirmed two-day new-release unlock transition from typed traces |
| Movie return validation | `movie-return-validation.json` | Verifies a private runtime observation against its exact movie-return mechanics artifact |
| Film catalog | `film-catalog.json` | Converts the film rows into stable NeonRetroRewind records |

An artifact is a JSON file produced by one of these commands.
Package files such as `.pak` contain the installed game's Unreal assets.
An Unreal DataTable stores many records with the same fields, and a StringTable stores named text entries.
A JSON Schema is a rule file used to check a JSON artifact's required fields and value types.
Acquisition artifacts contain extracted game data, so the examples store them in ignored `.local` directories.

## Before you start

You need the following items:

- Windows and a licensed Steam installation of *Retro Rewind: Video Store Simulator*.
- The .NET 10 SDK for the acquisition commands.
- Node.js `24.19.0` and pnpm `11.x` for the normalized-data compilers.
- An internet connection for the first dependency installation unless the packages are already cached.
- A `.usmap` mapping generated for the exact game executable when running the structured-index, structured-values, rental-evidence, unlockable-evidence, unlockable-function-trace, unlockable-implementation-sites, unlockable-manager-trace, rental-blueprint-bodies, blueprint-call-sites, blueprint-caller-bodies, blueprint-function-trace, and rental-function-trace steps.

The recommended setup uses portable tool archives extracted into ignored local directories.
Follow [Portable local tool setup](docs/portable-tool-setup.md) to install nothing system-wide and change `PATH` only for the current shell process.

The repository does not currently generate the `.usmap` mapping.
If you do not already have a matching mapping, you can complete the probe, build-manifest, and static-census steps, then stop.
Do not reuse a mapping from a different game build.

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
The game does not need to be running for any command in this README.

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

## 7b. Trace the unlock eligibility and mutation functions

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

## 7c. Discover unlock implementation sites

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
Function-name call sites are candidates because virtual Kismet calls do not always encode a unique declaring class; inheritance and override records use exact class paths.
The command verifies all package and input identities before and after scanning, accepts identical existing output, and refuses to overwrite different content.
The output contains extracted game metadata and must remain in the ignored local acquisition directory.

## 7d. Trace the unlock-manager event graph

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

## 8. Extract readable rental Blueprint bodies

This step loads the cooked script bytecode for the four generated classes recorded in the rental-evidence artifact.
It records each function's flags and bytecode-expression count, then uses CUE4Parse to produce deterministic pseudocode for review.
The pseudocode is a decompiler interpretation and must be checked against the underlying function metadata before it becomes a mechanic fact.

```powershell
dotnet run --project $extractor -- rental-blueprint-bodies `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --rental-evidence (Join-Path $buildDirectory "rental-evidence.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "rental-blueprint-bodies.json")
```

```bash
dotnet run --project "$extractor" -- rental-blueprint-bodies \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --rental-evidence "$buildDirectory/rental-evidence.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/rental-blueprint-bodies.json"
```

The output contains extracted game logic and must remain in the ignored local acquisition directory.

## 9. Find calls to the movie-return selector

This step uses the static census to select parsed packages that export Blueprint functions.
It reads their Kismet expressions and records calls to one exact function name without copying the surrounding Blueprint bodies.
The artifact reports complete or partial coverage, scan totals, call-site metadata, and package failure types.

```powershell
dotnet run --project $extractor -- blueprint-call-sites `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --target-function "Select Example Items" `
  --output (Join-Path $buildDirectory "blueprint-call-sites.movie-return.json")
```

```bash
dotnet run --project "$extractor" -- blueprint-call-sites \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --target-function "Select Example Items" \
  --output "$buildDirectory/blueprint-call-sites.movie-return.json"
```

The output contains game-specific caller locations and must remain in the ignored local acquisition directory.

## 10. Extract the movie-return caller bodies

This step accepts only a complete call-site artifact for the same build and mappings.
It rechecks every recorded call and decompiles only the functions that contain them.

```powershell
dotnet run --project $extractor -- blueprint-caller-bodies `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --call-sites (Join-Path $buildDirectory "blueprint-call-sites.movie-return.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "blueprint-caller-bodies.movie-return.json")
```

```bash
dotnet run --project "$extractor" -- blueprint-caller-bodies \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --call-sites "$buildDirectory/blueprint-call-sites.movie-return.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/blueprint-caller-bodies.movie-return.json"
```

The output contains game-specific function bodies and must remain in the ignored local acquisition directory.

## 11. Trace the movie-customer function entry

This step searches the same complete Blueprint package set for calls to the customer function discovered by the movie-return scan.
It determines whether another Blueprint function invokes that customer function before any broader event or native-boundary investigation.

```powershell
dotnet run --project $extractor -- blueprint-call-sites `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --target-function "Initialize Example Return" `
  --output (Join-Path $buildDirectory "blueprint-call-sites.movie-customer-entry.json")
```

```bash
dotnet run --project "$extractor" -- blueprint-call-sites \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --target-function "Initialize Example Return" \
  --output "$buildDirectory/blueprint-call-sites.movie-customer-entry.json"
```

The output contains game-specific caller locations and must remain in the ignored local acquisition directory.

## 12. Extract the movie-customer event graph

This step verifies the complete customer-entry call-site artifact and decompiles only the event-graph function that contains its call.
The result exposes the entry label and control flow immediately surrounding the movie-customer function.

```powershell
dotnet run --project $extractor -- blueprint-caller-bodies `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --call-sites (Join-Path $buildDirectory "blueprint-call-sites.movie-customer-entry.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "blueprint-caller-bodies.movie-customer-entry.json")
```

```bash
dotnet run --project "$extractor" -- blueprint-caller-bodies \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --call-sites "$buildDirectory/blueprint-call-sites.movie-customer-entry.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/blueprint-caller-bodies.movie-customer-entry.json"
```

The output contains game-specific event-graph pseudocode and must remain in the ignored local acquisition directory.

## 13. Trace the AI client event-graph wrappers

This step searches the complete Blueprint package set for wrapper functions that call the AI client ubergraph.
The resulting wrapper list can then be decompiled to identify which numeric entry point each wrapper supplies.

```powershell
dotnet run --project $extractor -- blueprint-call-sites `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --target-function "ExecuteExampleGraph_ExampleActor" `
  --output (Join-Path $buildDirectory "blueprint-call-sites.ai-client-ubergraph.json")
```

```bash
dotnet run --project "$extractor" -- blueprint-call-sites \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --target-function "ExecuteExampleGraph_ExampleActor" \
  --output "$buildDirectory/blueprint-call-sites.ai-client-ubergraph.json"
```

The output contains game-specific wrapper locations and must remain in the ignored local acquisition directory.

## 14. Extract the AI client event-graph wrappers

This step verifies the preceding call-site artifact and decompiles the exact wrapper functions it found.
The result maps each wrapper to the numeric entry point it passes into the AI client event graph.

```powershell
dotnet run --project $extractor -- blueprint-caller-bodies `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --call-sites (Join-Path $buildDirectory "blueprint-call-sites.ai-client-ubergraph.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "blueprint-caller-bodies.ai-client-ubergraph.json")
```

```bash
dotnet run --project "$extractor" -- blueprint-caller-bodies \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --call-sites "$buildDirectory/blueprint-call-sites.ai-client-ubergraph.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/blueprint-caller-bodies.ai-client-ubergraph.json"
```

The output contains game-specific wrapper pseudocode and must remain in the ignored local acquisition directory.

## 15. Create the typed Blueprint function trace

This step rereads the exact functions in the three caller-body artifacts from cooked Kismet bytecode.
It writes typed nodes for calls, call arguments, branches, jumps, assignments, variables, symbols, literals, contexts, and returns.
Each input file is recorded by hash, and the command confirms that its functions and target calls still match the game package.

```powershell
dotnet run --project $extractor -- blueprint-function-trace `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --caller-bodies (Join-Path $buildDirectory "blueprint-caller-bodies.ai-client-ubergraph.json") `
  --caller-bodies (Join-Path $buildDirectory "blueprint-caller-bodies.movie-customer-entry.json") `
  --caller-bodies (Join-Path $buildDirectory "blueprint-caller-bodies.movie-return.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "blueprint-function-trace.movie-customer.json")
```

```bash
dotnet run --project "$extractor" -- blueprint-function-trace \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --caller-bodies "$buildDirectory/blueprint-caller-bodies.ai-client-ubergraph.json" \
  --caller-bodies "$buildDirectory/blueprint-caller-bodies.movie-customer-entry.json" \
  --caller-bodies "$buildDirectory/blueprint-caller-bodies.movie-return.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/blueprint-function-trace.movie-customer.json"
```

The output contains game-specific bytecode structure and must remain in the ignored local acquisition directory.

## 16. Create the typed rental function trace

This step rereads four exact `ExampleQueueSystem` functions from cooked Kismet bytecode.
The rental Blueprint-body artifact supplies the expected package, class, function paths, flags, and bytecode-expression counts.
The command verifies that source artifact, the build, the mappings, and the game packages before and after extraction.

```powershell
$rentSystemClass = "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.ExampleQueueSystem_C:"

dotnet run --project $extractor -- rental-function-trace `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --rental-blueprint-bodies (Join-Path $buildDirectory "rental-blueprint-bodies.json") `
  --function-path ($rentSystemClass + "Example Period Event") `
  --function-path ($rentSystemClass + "Prepare Example Items") `
  --function-path ($rentSystemClass + "ExecuteExampleGraph_ExampleQueueSystem") `
  --function-path ($rentSystemClass + "Select Example Items") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "rental-function-trace.movie-return.json")
```

```bash
rentSystemClass="ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.ExampleQueueSystem_C:"

dotnet run --project "$extractor" -- rental-function-trace \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --rental-blueprint-bodies "$buildDirectory/rental-blueprint-bodies.json" \
  --function-path "${rentSystemClass}Example Period Event" \
  --function-path "${rentSystemClass}Prepare Example Items" \
  --function-path "${rentSystemClass}ExecuteExampleGraph_ExampleQueueSystem" \
  --function-path "${rentSystemClass}Select Example Items" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/rental-function-trace.movie-return.json"
```

The output contains game-specific bytecode structure and must remain in the ignored local acquisition directory.

## 17. Compile the console-return mechanics

This step validates both rental artifacts and confirms the expected class, fields, defaults, functions, and decompiled expressions before writing normalized facts.
The artifact records the configured rental duration, the eligibility comparison, the missing-weather result, and movement from the rented queue to the ready-to-return queue.
Each fact points back to its source class, property, or function.
The evidence level remains `decompiled-blueprint`, and runtime validation remains `not-run`.

Move into the TypeScript workspace if you are not already there.

```powershell
Push-Location projects/typescript
pnpm install --frozen-lockfile
```

```bash
pushd projects/typescript >/dev/null
pnpm install --frozen-lockfile
```

Compile the private mechanic artifact.

```powershell
pnpm console-return-mechanics `
  --rental-evidence (Join-Path $buildDirectory "rental-evidence.json") `
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.schema.json" `
  --blueprint-bodies (Join-Path $buildDirectory "rental-blueprint-bodies.json") `
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.schema.json" `
  --output (Join-Path $domainDirectory "console-return-mechanics.json")
```

```bash
pnpm console-return-mechanics \
  --rental-evidence "$buildDirectory/rental-evidence.json" \
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.schema.json" \
  --blueprint-bodies "$buildDirectory/rental-blueprint-bodies.json" \
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.schema.json" \
  --output "$domainDirectory/console-return-mechanics.json"
```

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The output contains normalized game rules and remains private and uncommitted.

## 18. Compile the membership-fee mechanics

This step uses the same two private rental artifacts as the console-return compiler.
It confirms the membership fee map, the five-field fee record, both mutation functions, and their decompiled expressions.
The result records how membership ID zero is handled, which fee counters accumulate, which counters are cleared, and how a fee record is removed.
Each fact points back to its source class field, struct field, or function.
The evidence level remains `decompiled-blueprint`, and runtime validation remains `not-run`.

Move into the TypeScript workspace if you are not already there.

```powershell
Push-Location projects/typescript
pnpm install --frozen-lockfile
```

```bash
pushd projects/typescript >/dev/null
pnpm install --frozen-lockfile
```

Compile the private mechanic artifact.

```powershell
pnpm membership-fee-mechanics `
  --rental-evidence (Join-Path $buildDirectory "rental-evidence.json") `
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.schema.json" `
  --blueprint-bodies (Join-Path $buildDirectory "rental-blueprint-bodies.json") `
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.schema.json" `
  --output (Join-Path $domainDirectory "membership-fee-mechanics.json")
```

```bash
pnpm membership-fee-mechanics \
  --rental-evidence "$buildDirectory/rental-evidence.json" \
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.schema.json" \
  --blueprint-bodies "$buildDirectory/rental-blueprint-bodies.json" \
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.schema.json" \
  --output "$domainDirectory/membership-fee-mechanics.json"
```

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The output contains normalized game rules and remains private and uncommitted.

## 19. Compile the movie-return mechanics

This step uses the two private rental artifacts, the complete movie-selector call-site artifact, the extracted caller-body artifact, and both typed function traces.
It traces the new-day event through its Blueprint dispatcher and confirms that all rented movies move into the ready-to-return queue before the rented queue is cleared.
It separately records the weighted selector's configured probabilities, override condition, four-item limit, candidate queue, and result behavior.
It records complete caller-search coverage, the BeginPlay entry path, the console-first customer branch, both selector calls, and movement of selected cartridges from the ready queue into customer inventory.
The compiler validates calls, arguments, branch targets, branch symbols, queue operations, selection outcomes, loop structure, and input hashes from the typed traces.
It does not parse rental or customer-flow pseudocode.
The base artifact's evidence level remains `decompiled-blueprint`, and runtime validation remains `not-run` until a clean passing report is linked into a separate derived artifact.

Move into the TypeScript workspace if you are not already there.

```powershell
Push-Location projects/typescript
pnpm install --frozen-lockfile
```

```bash
pushd projects/typescript >/dev/null
pnpm install --frozen-lockfile
```

Compile the private mechanic artifact.

```powershell
pnpm movie-return-mechanics `
  --rental-evidence (Join-Path $buildDirectory "rental-evidence.json") `
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.schema.json" `
  --blueprint-bodies (Join-Path $buildDirectory "rental-blueprint-bodies.json") `
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.schema.json" `
  --call-sites (Join-Path $buildDirectory "blueprint-call-sites.movie-return.json") `
  --call-sites-schema "../game-data-exporter/schemas/acquisition/blueprint-call-sites.schema.json" `
  --caller-bodies (Join-Path $buildDirectory "blueprint-caller-bodies.movie-return.json") `
  --caller-bodies-schema "../game-data-exporter/schemas/acquisition/blueprint-caller-bodies.schema.json" `
  --function-trace (Join-Path $buildDirectory "blueprint-function-trace.movie-customer.json") `
  --function-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-function-trace.schema.json" `
  --rental-function-trace (Join-Path $buildDirectory "rental-function-trace.movie-return.json") `
  --rental-function-trace-schema "../game-data-exporter/schemas/acquisition/rental-function-trace.schema.json" `
  --output (Join-Path $domainDirectory "movie-return-mechanics.json")
```

```bash
pnpm movie-return-mechanics \
  --rental-evidence "$buildDirectory/rental-evidence.json" \
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.schema.json" \
  --blueprint-bodies "$buildDirectory/rental-blueprint-bodies.json" \
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.schema.json" \
  --call-sites "$buildDirectory/blueprint-call-sites.movie-return.json" \
  --call-sites-schema "../game-data-exporter/schemas/acquisition/blueprint-call-sites.schema.json" \
  --caller-bodies "$buildDirectory/blueprint-caller-bodies.movie-return.json" \
  --caller-bodies-schema "../game-data-exporter/schemas/acquisition/blueprint-caller-bodies.schema.json" \
  --function-trace "$buildDirectory/blueprint-function-trace.movie-customer.json" \
  --function-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-function-trace.schema.json" \
  --rental-function-trace "$buildDirectory/rental-function-trace.movie-return.json" \
  --rental-function-trace-schema "../game-data-exporter/schemas/acquisition/rental-function-trace.schema.json" \
  --output "$domainDirectory/movie-return-mechanics.json"
```

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The output contains normalized game rules and remains private and uncommitted.

After a runtime observation passes, use `pnpm movie-return-validated-mechanics` as documented in [Movie-return runtime observation](movie-return-runtime-observation.md).
That command writes a new immutable mechanics artifact which identifies the exact base mechanics, observation, and passing validation report without rewriting the base file named by the report.

## 20. Compile the new-release unlock mechanics

This step joins the typed unlock-manager event graph with the typed wrapper entrypoints.
It confirms that `Reset to new Day Event_Event` enters the manager at statement `3364`, calls `ExampleReleaseEnabled`, compares the Weather Actor's current date with the first save-game day plus two days, and sets `ExampleReleaseKind` to `true` when the threshold is reached.
The compiler checks the exact build and mapping identities, wrapper entrypoints, typed calls and arguments, intermediate value flow, comparison, branch route, mutation, and input hashes.
It does not infer save/load behavior, costs, dependencies, or concrete content effects.
The artifact records typed-Blueprint evidence and `runtimeValidation: not-run`.

Move into the TypeScript workspace if you are not already there.

```powershell
Push-Location projects/typescript
pnpm install --frozen-lockfile
```

```bash
pushd projects/typescript >/dev/null
pnpm install --frozen-lockfile
```

Compile the private mechanic artifact.

```powershell
pnpm new-release-unlock-mechanics `
  --manager-trace (Join-Path $buildDirectory "unlockable-manager-trace.json") `
  --manager-trace-schema "../game-data-exporter/schemas/acquisition/unlockable-manager-trace.schema.json" `
  --wrapper-trace (Join-Path $buildDirectory "blueprint-function-trace.unlock-manager-entry.json") `
  --wrapper-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-function-trace.schema.json" `
  --output (Join-Path $domainDirectory "new-release-unlock-mechanics.json")
```

```bash
pnpm new-release-unlock-mechanics \
  --manager-trace "$buildDirectory/unlockable-manager-trace.json" \
  --manager-trace-schema "../game-data-exporter/schemas/acquisition/unlockable-manager-trace.schema.json" \
  --wrapper-trace "$buildDirectory/blueprint-function-trace.unlock-manager-entry.json" \
  --wrapper-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-function-trace.schema.json" \
  --output "$domainDirectory/new-release-unlock-mechanics.json"
```

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The output contract is the executable `NewReleaseUnlockMechanicsSchema` in `projects/typescript/packages/core/src/contracts/domain/new-release-unlock-mechanics.ts`.
The generated artifact remains private and is not committed.

## 21. Compile the normalized film catalog

The TypeScript compiler validates the structured-values artifact with the canonical ArkType contract and independently checks the generated JSON Schema supplied on the command line.
It maps the 13 catalog DataTables into film records and retains the source table path and row key for each record.
The game's numeric SKU is the unique film key, and records are written in ascending SKU order.
Two auxiliary tables reuse the same Unreal row structure and are explicitly excluded from the film catalog.

Move into the TypeScript workspace and install its locked dependencies.

```powershell
Push-Location projects/typescript
pnpm install --frozen-lockfile
```

```bash
pushd projects/typescript >/dev/null
pnpm install --frozen-lockfile
```

Compile the catalog into the ignored local domain directory.

```powershell
pnpm film-catalog `
  --input (Join-Path $buildDirectory "structured-values.json") `
  --input-schema "../game-data-exporter/schemas/acquisition/structured-values.schema.json" `
  --output (Join-Path $domainDirectory "film-catalog.json")
```

```bash
pnpm film-catalog \
  --input "$buildDirectory/structured-values.json" \
  --input-schema "../game-data-exporter/schemas/acquisition/structured-values.schema.json" \
  --output "$domainDirectory/film-catalog.json"
```

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The compiler creates missing output directories, accepts identical existing output, and refuses to overwrite different content.
The film catalog still contains extracted game text and remains private and uncommitted.

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

Collector `0.1.7` implements the bounded hooks and observation writer, resolves the inherited inventory function through the customer class hierarchy, scopes inventory reads to active customer returns, and reports bounded target, callable-dispatch, reflected-contract, registration, and callback labels without enumerating unrelated runtime objects. Resolved functions whose callable dispatch is not yet available are retried; unsupported flag and dispatch combinations fail closed. A customer frame binds its ExampleQueueSystem and pre-ready queue only when the nested movie selector runs, and customer calls that never enter the movie branch produce no movie-return event. Selector post-hooks read Blueprint out-parameters through UE4SS's `FFrame::OutParms` lookup rather than the temporary locals container. A user-operated run for Steam build `23896268` completed and passed the repository's semantic validator; the observation and validation report remain private ignored artifacts. The following command prepares its ignored staging payload without changing the game directory.

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
They accept only collector staging manifests; the probe commands accept only probe manifests.

## Common problems

### A command says that a file does not exist

Check `$steamRoot`, then run the path setup block again.
Paths containing spaces are safe when passed through the variables shown above.

### The output conflicts with an existing file

The artifact commands never replace different existing content.
Use a new build directory for a different game build or choose a new output filename.

### The structured index rejects the mapping

Confirm that the `.usmap` file came from the same game executable as the build manifest.
The repository cannot repair or convert a mapping from another build.

### `pnpm` is not recognized

Install pnpm `11.x`, open a new PowerShell or Git Bash window, and run `pnpm --version` again.

## Artifact contracts

`@neonretrorewind/core` owns one executable ArkType contract for every acquisition, domain, runtime, and validation artifact.
Public TypeScript types use each contract's `infer` type instead of separate handwritten interfaces.
The compiler and validator call the ArkType contracts at JSON and output boundaries.
Acquisition, runtime-host, runtime-observation, and movie-return-mechanics contracts also produce standalone JSON Schema because .NET, C++, or another language-neutral tool consumes those artifacts.
TypeScript-only domain artifacts and the movie-return validation report do not have standalone schema files.
The retained JSON Schemas and generated TypeScript contract types must be regenerated after changing a canonical contract.

Run these commands from `projects/typescript`:

```text
pnpm contracts:generate
pnpm contracts:check
```

The workspace `pnpm check` command includes `contracts:check` and fails when generated output is stale.

## Repository layout

- `projects/game-data-exporter/static-extractor` contains the .NET 10 acquisition commands.
- `projects/game-data-exporter/schemas/acquisition` contains generated JSON Schemas for .NET acquisition boundaries.
- `projects/game-data-exporter/schemas/runtime` contains generated JSON Schemas for runtime-host, collector, and observation boundaries.
- `projects/game-data-exporter/runtime-exporter` contains the offline probe and collector runtime-host lifecycle commands and the Lua compatibility probe source.
- `projects/game-data-exporter/runtime-collector` contains the bounded UE4SS C++ collector and its local Windows build entry points.
- [Movie-return runtime observation](movie-return-runtime-observation.md) defines the first runtime test and the collector's limits.
- `projects/typescript/packages/core` owns the canonical executable artifact contracts, inferred public types, and generated boundary-schema workflow.
- `projects/typescript/packages/data-compiler` validates acquisition data and compiles private domain artifacts.
- `projects/typescript/packages/validator` checks ordered runtime observations against deterministic mechanic relationships.

## License

Original NeonRetroRewind source code is licensed under the [Apache License 2.0](LICENSE).
NeonRetroRewind is provided as is, without warranty of any kind, to the extent permitted by applicable law.
The licence contains the complete warranty disclaimer and limitation of liability.

## Disclaimer

NeonRetroRewind is an unofficial fan project and is not affiliated with or endorsed by the developers or publishers of *Retro Rewind: Video Store Simulator*.
The game and its related names and assets belong to their respective owners.
