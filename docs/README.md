# NeonRewind

NeonRewind is an unofficial, open-source project for *Retro Rewind: Video Store Simulator*.
It currently reads data from an installed Steam copy of the game, converts the film tables into a consistent JSON catalog, and compiles the first rental mechanic facts.
The public guide, calculators, and website have not been built yet.

## Data and distribution boundary

The repository contains source code, JSON Schemas, normalization logic, and instructions.
Users provide their own licensed game installation and run the acquisition commands locally.

Do not commit or publish:

- Compiled extractor binaries
- Game binaries, package files, mappings, or saves
- Build manifests or static censuses produced from a game installation
- Structured values, rental evidence, or Blueprint pseudocode
- Compiled film catalogs, mechanic artifacts, or extracted game text
- Extracted or modified game assets

The documented output directories are ignored by Git.

## What the current workflow does

The commands form one pipeline, and each command uses the file produced by the previous command.

| Step | Result | Meaning |
|---|---|---|
| Build manifest | `build-manifest.json` | Identifies the exact Steam build and package hashes |
| Static census | `static-census.v1.json` | Lists files, Unreal packages, and exported classes |
| Structured index | `structured-asset-index.v1.json` | Locates DataTables and StringTables using a matching Unreal mapping |
| Structured values | `structured-values.v1.json` | Extracts table rows and strings into deterministic JSON |
| Rental evidence | `rental-evidence.v1.json` | Extracts the rental subsystem's fields, functions, explicit defaults, and default-value object references |
| Rental Blueprint bodies | `rental-blueprint-bodies.v1.json` | Decompiles the rental subsystem's cooked Blueprint bytecode into reviewable pseudocode |
| Console return mechanics | `console-return-mechanics.v1.json` | Normalizes console-return eligibility and queue movement with source locators |
| Membership fee mechanics | `membership-fee-mechanics.v1.json` | Normalizes membership fee storage, accumulation, and removal with source locators |
| Movie return mechanics | `movie-return-mechanics.v1.json` | Separates new-day movie readiness from weighted return selection and records caller coverage |
| Film catalog | `film-catalog.v1.json` | Converts the film rows into stable NeonRewind records |

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
- A `.usmap` mapping generated for the exact game executable when running the structured-index, structured-values, rental-evidence, and rental-blueprint-bodies steps.

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
$extractor = "projects/game-data-exporter/static-extractor/NeonRewind.StaticExtractor.csproj"
$buildDirectory = "projects/game-data-exporter/.local/acquisition/current"

New-Item -ItemType Directory -Force -Path $buildDirectory | Out-Null
```

```bash
steamRoot="C:\Program Files (x86)\Steam"
gameRoot="$steamRoot/steamapps\common\RetroRewind"
steamManifest="$steamRoot/steamapps\appmanifest_3552140.acf"
packageDirectory="$gameRoot/RetroRewind\Content\Paks"
packageFile="$packageDirectory/RetroRewind-Windows.pak"
executable="$gameRoot/RetroRewind\Binaries\Win64\RetroRewind-Win64-Shipping.exe"
extractor="projects/game-data-exporter/static-extractor/NeonRewind.StaticExtractor.csproj"
buildDirectory="projects/game-data-exporter/.local/acquisition/current"

mkdir -p "$buildDirectory"
```

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
  --output (Join-Path $buildDirectory "static-census.v1.json")
```

```bash
dotnet run --project "$extractor" -- census \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/static-census.v1.json"
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

The next four acquisition commands cannot run reliably without this file.

## 5. Create the structured index

The structured index fully reads candidate DataTables, StringTables, and direct data assets without copying their row values.
It records the table locations, structures, row counts, property counts, and failures.

```powershell
dotnet run --project $extractor -- structured-index `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.v1.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "structured-asset-index.v1.json")
```

```bash
dotnet run --project "$extractor" -- structured-index \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.v1.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/structured-asset-index.v1.json"
```

The command validates the manifest, census, mapping, and package identities before and after parsing.

## 6. Extract the structured values

This step copies the indexed DataTable rows and StringTable entries into deterministic JSON.
The output contains game text and must remain in the ignored local acquisition directory.

```powershell
dotnet run --project $extractor -- structured-values `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --structured-index (Join-Path $buildDirectory "structured-asset-index.v1.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "structured-values.v1.json")
```

```bash
dotnet run --project "$extractor" -- structured-values \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --structured-index "$buildDirectory/structured-asset-index.v1.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/structured-values.v1.json"
```

The command verifies every input again after extraction and refuses to overwrite different output.

## 7. Extract the rental-system evidence

This step reads six packages that define the rental manager, its two structs, and three related AI tasks.
It records generated-class fields, function names, class-default values, struct defaults, and object references contained in those mapped defaults.
The command stops if the exact package cluster is absent from the census.

```powershell
dotnet run --project $extractor -- rental-evidence `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --static-census (Join-Path $buildDirectory "static-census.v1.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "rental-evidence.v1.json")
```

```bash
dotnet run --project "$extractor" -- rental-evidence \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --static-census "$buildDirectory/static-census.v1.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/rental-evidence.v1.json"
```

The output contains extracted game values and must remain in the ignored local acquisition directory.

## 8. Extract readable rental Blueprint bodies

This step loads the cooked script bytecode for the four generated classes recorded in the rental-evidence artifact.
It records each function's flags and bytecode-expression count, then uses CUE4Parse to produce deterministic pseudocode for review.
The pseudocode is a decompiler interpretation and must be checked against the underlying function metadata before it becomes a mechanic fact.

```powershell
dotnet run --project $extractor -- rental-blueprint-bodies `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --rental-evidence (Join-Path $buildDirectory "rental-evidence.v1.json") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "rental-blueprint-bodies.v1.json")
```

```bash
dotnet run --project "$extractor" -- rental-blueprint-bodies \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --rental-evidence "$buildDirectory/rental-evidence.v1.json" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/rental-blueprint-bodies.v1.json"
```

The output contains extracted game logic and must remain in the ignored local acquisition directory.

## 9. Compile the console-return mechanics

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
  --rental-evidence "../game-data-exporter/.local/acquisition/current/rental-evidence.v1.json" `
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.v1.schema.json" `
  --blueprint-bodies "../game-data-exporter/.local/acquisition/current/rental-blueprint-bodies.v1.json" `
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.v1.schema.json" `
  --output ".local/domain/current/console-return-mechanics.v1.json"
```

```bash
pnpm console-return-mechanics \
  --rental-evidence "../game-data-exporter/.local/acquisition/current/rental-evidence.v1.json" \
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.v1.schema.json" \
  --blueprint-bodies "../game-data-exporter/.local/acquisition/current/rental-blueprint-bodies.v1.json" \
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.v1.schema.json" \
  --output ".local/domain/current/console-return-mechanics.v1.json"
```

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The output contains normalized game rules and remains private and uncommitted.

## 10. Compile the membership-fee mechanics

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
  --rental-evidence "../game-data-exporter/.local/acquisition/current/rental-evidence.v1.json" `
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.v1.schema.json" `
  --blueprint-bodies "../game-data-exporter/.local/acquisition/current/rental-blueprint-bodies.v1.json" `
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.v1.schema.json" `
  --output ".local/domain/current/membership-fee-mechanics.v1.json"
```

```bash
pnpm membership-fee-mechanics \
  --rental-evidence "../game-data-exporter/.local/acquisition/current/rental-evidence.v1.json" \
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.v1.schema.json" \
  --blueprint-bodies "../game-data-exporter/.local/acquisition/current/rental-blueprint-bodies.v1.json" \
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.v1.schema.json" \
  --output ".local/domain/current/membership-fee-mechanics.v1.json"
```

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The output contains normalized game rules and remains private and uncommitted.

## 11. Compile the movie-return mechanics

This step uses the same two private rental artifacts as the other mechanic compilers.
It traces the new-day event through its Blueprint dispatcher and confirms that all rented movies move into the ready-to-return queue before the rented queue is cleared.
It separately records the weighted selector's configured probabilities, override condition, four-item limit, candidate queue, and result behavior.
The current rental Blueprint artifact contains the selector definition but no caller, so this artifact does not claim that its weights are the confirmed nightly return probabilities.
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
pnpm movie-return-mechanics `
  --rental-evidence "../game-data-exporter/.local/acquisition/current/rental-evidence.v1.json" `
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.v1.schema.json" `
  --blueprint-bodies "../game-data-exporter/.local/acquisition/current/rental-blueprint-bodies.v1.json" `
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.v1.schema.json" `
  --output ".local/domain/current/movie-return-mechanics.v1.json"
```

```bash
pnpm movie-return-mechanics \
  --rental-evidence "../game-data-exporter/.local/acquisition/current/rental-evidence.v1.json" \
  --rental-evidence-schema "../game-data-exporter/schemas/acquisition/rental-evidence.v1.schema.json" \
  --blueprint-bodies "../game-data-exporter/.local/acquisition/current/rental-blueprint-bodies.v1.json" \
  --blueprint-bodies-schema "../game-data-exporter/schemas/acquisition/rental-blueprint-bodies.v1.schema.json" \
  --output ".local/domain/current/movie-return-mechanics.v1.json"
```

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The output contains normalized game rules and remains private and uncommitted.

## 12. Compile the normalized film catalog

The TypeScript compiler validates the structured-values artifact against its JSON Schema.
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
  --input "../game-data-exporter/.local/acquisition/current/structured-values.v1.json" `
  --input-schema "../game-data-exporter/schemas/acquisition/structured-values.v1.schema.json" `
  --output ".local/domain/current/film-catalog.v1.json"
```

```bash
pnpm film-catalog \
  --input "../game-data-exporter/.local/acquisition/current/structured-values.v1.json" \
  --input-schema "../game-data-exporter/schemas/acquisition/structured-values.v1.schema.json" \
  --output ".local/domain/current/film-catalog.v1.json"
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

## Repository layout

- `projects/game-data-exporter/static-extractor` contains the .NET 10 acquisition commands.
- `projects/game-data-exporter/schemas/acquisition` contains the acquisition JSON Schemas.
- `projects/game-data-exporter/runtime-exporter` is an empty scaffold.
- `projects/typescript/packages/core` owns the normalized domain types and schemas.
- `projects/typescript/packages/data-compiler` validates acquisition data and compiles private domain artifacts.
- `projects/typescript/packages/validator` is an empty scaffold.

## License

Original NeonRewind source code is licensed under the [Apache License 2.0](LICENSE).
NeonRewind is provided as is, without warranty of any kind, to the extent permitted by applicable law.
The licence contains the complete warranty disclaimer and limitation of liability.

## Disclaimer

NeonRewind is an unofficial fan project and is not affiliated with or endorsed by the developers or publishers of *Retro Rewind: Video Store Simulator*.
The game and its related names and assets belong to their respective owners.
