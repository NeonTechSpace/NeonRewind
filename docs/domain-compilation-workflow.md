# Domain compilation workflow

This page shows how to turn private research evidence into stable records owned by NeonRetroRewind.
These records describe supported game facts without making later guide code depend on the game's internal file layout.

[Research overview](research-overview.md) · [Previous: Blueprint analysis](blueprint-analysis-workflow.md) · [Optional next step: runtime preparation](runtime-preparation-workflow.md)

## Who needs this page

Use this workflow after collecting evidence for one of the implemented research areas.
It is the final static research stage and is enough for questions the game files answer clearly.

## What you will produce

Each command checks that its input artifacts have the expected build, fields, values, and source references.
It then writes a normalized record for one area such as movie returns or the film catalog.

Normalized means the record uses a consistent NeonRetroRewind shape instead of copying the layout used inside the game.
The output is still derived from the game, so it remains private and uncommitted.

## Before you start

Complete the [static acquisition](static-acquisition-workflow.md) and relevant [Blueprint analysis](blueprint-analysis-workflow.md) steps first.
You need Node.js `24.19.0` and pnpm `11.x`.

The commands below continue the numbering from the earlier workflows because they consume those earlier outputs.

## 20. Compile the console-return mechanics

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

## 21. Compile the membership-fee mechanics

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

## 22. Compile the movie-return mechanics

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

## 23. Compile the new-release mechanics

This step joins the typed unlock-manager event graph, typed wrapper entrypoints, traced property reader, typed `Generate Example Request` body, candidate-map trace, and verified call-target trace.
It confirms that `Reset to new Day Event_Event` enters the manager at statement `3364`, calls `ExampleReleaseEnabled`, compares the Weather Actor's current date with the first save-game day plus two days, and sets `ExampleReleaseKind` to `true` when the threshold is reached.
It also confirms that `Return Example Request` combines the flag with `RandomBoolWithWeight(0.5)` and, on success, selects guaranteed request step 1, records primary request code `5` as required, and outputs `Only New Release` as `true`.
`Generate Example Request` copies those outputs and, when `Only New Release` is true, the game-mode cast succeeds, the candidate map is nonempty, and `RandomBoolWithWeight(0.66)` succeeds, enumerates that map's keys and values and reads both at one random index.
The Blueprint passes `candidate count - 1` to Unreal Engine 5.4's `RandomInteger`, whose implementation returns zero for nonpositive input and otherwise samples from zero inclusive to its input exclusive.
Consequently, a one-entry map selects index zero.
A map with two or more entries can select only indices zero through `candidate count - 2`, which leaves the final enumerated key/value pair unreachable.
Candidate-selection failure after a successful `Return Example Request` call still rejoins `ExampleGenerateSuccess = true`.
The candidate map is cleared and rebuilt from `Example Source Map`.
The caller admits only records whose `Released` field is true and `SecondHand-Available` field is false.
The verified `ExampleRecord_C:Evaluate Example Record` target then computes `is New = (Example Period Count - Example Available Period) <= 7` and remaining days as `(Example Available Period + 7) - Example Period Count`.
Its game-mode cast failure returns false and zero.
The predicate contains no lower-bound comparison.
Eligible records are written to `Example Candidate Map` with second-hand false and base price zero.
A failed caller precondition returns without mutation.
A failed predicate rewrites the record in `Example Source Map` with second-hand true and base price zero.
The compiler checks the exact build, mapping, and engine identities, trace scopes, wrapper entrypoints, typed calls and arguments, target receiver and declaration binding, intermediate value flow, comparisons, branch routes, map access, paired array indexes, mutations, outputs, and input hashes.
It does not infer save/load behavior, costs, dependencies, exact film identities, runtime map contents, map enumeration identity, or runtime probabilities.
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
pnpm new-release-mechanics `
  --manager-trace (Join-Path $buildDirectory "unlockable-manager-trace.json") `
  --manager-trace-schema "../game-data-exporter/schemas/acquisition/unlockable-manager-trace.schema.json" `
  --wrapper-trace (Join-Path $buildDirectory "blueprint-function-trace.unlock-manager-entry.json") `
  --wrapper-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-function-trace.schema.json" `
  --property-reader-trace (Join-Path $buildDirectory "blueprint-property-reference-trace.new-release-unlock.json") `
  --property-reader-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-property-reference-trace.schema.json" `
  --request-generator-trace (Join-Path $buildDirectory "blueprint-function-trace.generate-movie-request.json") `
  --request-generator-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-function-trace.schema.json" `
  --candidate-map-trace (Join-Path $buildDirectory "blueprint-property-reference-trace.new-release-candidates.json") `
  --candidate-map-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-property-reference-trace.schema.json" `
  --call-target-trace (Join-Path $buildDirectory "blueprint-call-target-trace.return-if-film-is-new.json") `
  --call-target-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-call-target-trace.schema.json" `
  --output (Join-Path $domainDirectory "new-release-mechanics.json")
```

```bash
pnpm new-release-mechanics \
  --manager-trace "$buildDirectory/unlockable-manager-trace.json" \
  --manager-trace-schema "../game-data-exporter/schemas/acquisition/unlockable-manager-trace.schema.json" \
  --wrapper-trace "$buildDirectory/blueprint-function-trace.unlock-manager-entry.json" \
  --wrapper-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-function-trace.schema.json" \
  --property-reader-trace "$buildDirectory/blueprint-property-reference-trace.new-release-unlock.json" \
  --property-reader-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-property-reference-trace.schema.json" \
  --request-generator-trace "$buildDirectory/blueprint-function-trace.generate-movie-request.json" \
  --request-generator-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-function-trace.schema.json" \
  --candidate-map-trace "$buildDirectory/blueprint-property-reference-trace.new-release-candidates.json" \
  --candidate-map-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-property-reference-trace.schema.json" \
  --call-target-trace "$buildDirectory/blueprint-call-target-trace.return-if-film-is-new.json" \
  --call-target-trace-schema "../game-data-exporter/schemas/acquisition/blueprint-call-target-trace.schema.json" \
  --output "$domainDirectory/new-release-mechanics.json"
```

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The output contract is the executable `NewReleaseMechanicsSchema` in `projects/typescript/packages/core/src/contracts/domain/new-release-mechanics.ts`.
The generated artifact remains private and is not committed.

## 24. Compile the normalized film catalog

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

## Next step

Runtime collection is necessary only for claims that require controlled observation.
See [runtime preparation](runtime-preparation-workflow.md) and the [movie-return observation case](movie-return-runtime-observation.md).

[Research overview](research-overview.md)
