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
The implemented commands cover the film catalog, console returns, membership fees, movie returns, new releases, level progression, the daily movie Market, checkout income, and Market rental economics.

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
  --blueprint-bodies (Join-Path $buildDirectory "rental-blueprint-bodies.json") `
  --output (Join-Path $domainDirectory "console-return-mechanics.json")
```

```bash
pnpm console-return-mechanics \
  --rental-evidence "$buildDirectory/rental-evidence.json" \
  --blueprint-bodies "$buildDirectory/rental-blueprint-bodies.json" \
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
  --blueprint-bodies (Join-Path $buildDirectory "rental-blueprint-bodies.json") `
  --output (Join-Path $domainDirectory "membership-fee-mechanics.json")
```

```bash
pnpm membership-fee-mechanics \
  --rental-evidence "$buildDirectory/rental-evidence.json" \
  --blueprint-bodies "$buildDirectory/rental-blueprint-bodies.json" \
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
  --blueprint-bodies (Join-Path $buildDirectory "rental-blueprint-bodies.json") `
  --call-sites (Join-Path $buildDirectory "blueprint-call-sites.movie-return.json") `
  --caller-bodies (Join-Path $buildDirectory "blueprint-caller-bodies.movie-return.json") `
  --function-trace (Join-Path $buildDirectory "blueprint-function-trace.movie-customer.json") `
  --rental-function-trace (Join-Path $buildDirectory "rental-function-trace.movie-return.json") `
  --output (Join-Path $domainDirectory "movie-return-mechanics.json")
```

```bash
pnpm movie-return-mechanics \
  --rental-evidence "$buildDirectory/rental-evidence.json" \
  --blueprint-bodies "$buildDirectory/rental-blueprint-bodies.json" \
  --call-sites "$buildDirectory/blueprint-call-sites.movie-return.json" \
  --caller-bodies "$buildDirectory/blueprint-caller-bodies.movie-return.json" \
  --function-trace "$buildDirectory/blueprint-function-trace.movie-customer.json" \
  --rental-function-trace "$buildDirectory/rental-function-trace.movie-return.json" \
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

This step joins the typed unlock-manager event graph, typed unlock and Market wrapper entrypoints, traced property readers, typed request and source-map flows, the candidate-map trace, and the verified predicate and monthly-schedule call-target traces.
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
`ExampleManager_C.Load` enters `ExecuteExampleGraph_ExampleManager` at statement `2622` and replaces `Example Source Map` from `Example Save Source Map`.
`ExampleGenerateRecord` reads rows from `ExampleScheduleTable`, retains rows whose genre is present in `Example Enabled Categories`, and randomly chooses an unused row before adding its constructed film record to the source and poster maps by product SKU.
After generation, the function enumerates source-map values and removes records whose second-hand field is true by using each record's nested product SKU.
`Generate Example Event` clears the calendar maps and generates days 1 through 28.
The new-release counter starts at zero on the first save day and at two on later months.
On an unforced day, it increments once before event selection.
Each eligible nonseasonal evaluation draws a new inclusive integer from 4 through 5 and releases a movie when the counter is greater than or equal to that draw.
A release resets the counter to zero.
The full game forces a movie release on day 3 of the first save month.
The demo forces movie releases on days 3 and 6 and a no-event entry on day 7.
A nonzero seasonal event takes precedence over the new-release selection and does not reset the counter.
The compiler checks the exact build, mapping, and engine identities, trace scopes, wrapper entrypoints, typed calls and arguments, target receiver and declaration binding, intermediate value flow, comparisons, branch routes, map access, paired array indexes, mutations, outputs, and input hashes.
It does not infer save behavior, costs, dependencies, exact film identities, runtime map contents, map enumeration identity, or runtime probabilities.
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
  --wrapper-trace (Join-Path $buildDirectory "blueprint-function-trace.unlock-manager-entry.json") `
  --property-reader-trace (Join-Path $buildDirectory "blueprint-property-reference-trace.new-release-unlock.json") `
  --request-generator-trace (Join-Path $buildDirectory "blueprint-function-trace.generate-movie-request.json") `
  --market-entry-trace (Join-Path $buildDirectory "blueprint-function-trace.execute-ubergraph-market-entrypoints.json") `
  --source-map-trace (Join-Path $buildDirectory "blueprint-property-reference-trace.new-release-source-flow.json") `
  --candidate-map-trace (Join-Path $buildDirectory "blueprint-property-reference-trace.new-release-candidates.json") `
  --call-target-trace (Join-Path $buildDirectory "blueprint-call-target-trace.return-if-film-is-new.json") `
  --schedule-caller-trace (Join-Path $buildDirectory "blueprint-property-reference-trace.calendar-map.json") `
  --schedule-call-target-trace (Join-Path $buildDirectory "blueprint-call-target-trace.generate-month-event.json") `
  --output (Join-Path $domainDirectory "new-release-mechanics.json")
```

```bash
pnpm new-release-mechanics \
  --manager-trace "$buildDirectory/unlockable-manager-trace.json" \
  --wrapper-trace "$buildDirectory/blueprint-function-trace.unlock-manager-entry.json" \
  --property-reader-trace "$buildDirectory/blueprint-property-reference-trace.new-release-unlock.json" \
  --request-generator-trace "$buildDirectory/blueprint-function-trace.generate-movie-request.json" \
  --market-entry-trace "$buildDirectory/blueprint-function-trace.execute-ubergraph-market-entrypoints.json" \
  --source-map-trace "$buildDirectory/blueprint-property-reference-trace.new-release-source-flow.json" \
  --candidate-map-trace "$buildDirectory/blueprint-property-reference-trace.new-release-candidates.json" \
  --call-target-trace "$buildDirectory/blueprint-call-target-trace.return-if-film-is-new.json" \
  --schedule-caller-trace "$buildDirectory/blueprint-property-reference-trace.calendar-map.json" \
  --schedule-call-target-trace "$buildDirectory/blueprint-call-target-trace.generate-month-event.json" \
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

The TypeScript compiler validates the structured-values artifact with its canonical ArkType contract.
It maps the 13 catalog DataTables into the general `films` collection and maps `ExampleScheduleTable` into the separate `newReleaseFilms` collection.
Both collections retain the source table path and row key for each record.
The game's numeric SKU is the unique film key, and records are written in ascending SKU order.
The compiler rejects duplicate SKUs within or across the collections.
The remaining `ExampleAuxiliaryTable` auxiliary table reuses the same Unreal row structure and is explicitly excluded from the film catalog.

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
  --output (Join-Path $domainDirectory "film-catalog.json")
```

```bash
pnpm film-catalog \
  --input "$buildDirectory/structured-values.json" \
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

## 25. Compile level progression

This step joins the structured XP table, gameplay-unlock enum, and level-progression category enums with the typed experience-update, maximum-XP, and end-of-day traces.
It requires the verified call-target trace that binds the maximum-XP call to its exact declaration.
It also requires the same ignored private level-progression target profile used to extract the gameplay-unlock enum.
The compiler checks that every input uses the same build, mappings, Unreal Engine configuration, and target-profile identity.

The output records consecutive runtime-level thresholds, cumulative XP, exact gameplay-unlock, movie-category, and game-category values and display labels, the stored-experience cap, the raw daily-statistic update, the full-game requirement lookup, and the demo requirement override.
It also records the repeated end-of-day level transition and the maximum-level stop established by the typed Blueprint flow and Unreal Engine 5.4 source.
The compiler rejects unresolved or duplicate unlocks, inconsistent enum data, changed table fields, nonconsecutive levels, nonpositive XP, changed trace scopes, changed data flow, changed continuation targets, or a call target derived from another caller trace.

Move into the TypeScript workspace and install its locked dependencies.

```powershell
Push-Location projects/typescript
pnpm install --frozen-lockfile
```

```bash
pushd projects/typescript >/dev/null
pnpm install --frozen-lockfile
```

Compile the private progression artifact.

```powershell
$targetProfile = "../game-data-exporter/.local/targets/level-progression-target-profile.json"
```

```bash
targetProfile="../game-data-exporter/.local/targets/level-progression-target-profile.json"
```

```powershell
pnpm level-progression `
  --target-profile $targetProfile `
  --structured-values (Join-Path $buildDirectory "structured-values.json") `
  --gameplay-unlock-enum (Join-Path $buildDirectory "gameplay-unlock-enum.json") `
  --category-enums (Join-Path $buildDirectory "level-progression-category-enums.json") `
  --change-xp-trace (Join-Path $buildDirectory "blueprint-function-trace.change-xp.json") `
  --maximum-caller-trace (Join-Path $buildDirectory "blueprint-property-reference-trace.xp-need-for-max-level.json") `
  --maximum-target-trace (Join-Path $buildDirectory "blueprint-call-target-trace.return-xp-for-max-level.json") `
  --end-of-day-trace (Join-Path $buildDirectory "blueprint-property-reference-trace.end-of-day-level.json") `
  --output (Join-Path $domainDirectory "level-progression.json")
```

```bash
pnpm level-progression \
  --target-profile "$targetProfile" \
  --structured-values "$buildDirectory/structured-values.json" \
  --gameplay-unlock-enum "$buildDirectory/gameplay-unlock-enum.json" \
  --category-enums "$buildDirectory/level-progression-category-enums.json" \
  --change-xp-trace "$buildDirectory/blueprint-function-trace.change-xp.json" \
  --maximum-caller-trace "$buildDirectory/blueprint-property-reference-trace.xp-need-for-max-level.json" \
  --maximum-target-trace "$buildDirectory/blueprint-call-target-trace.return-xp-for-max-level.json" \
  --end-of-day-trace "$buildDirectory/blueprint-property-reference-trace.end-of-day-level.json" \
  --output "$domainDirectory/level-progression.json"
```

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The output contract is the executable `LevelProgressionSchema` in `projects/typescript/packages/core/src/contracts/domain/level-progression.ts`.
The target-profile contract is the executable `LevelProgressionTargetProfileSchema` in `projects/typescript/packages/core/src/contracts/config/level-progression-target-profile.ts`.
Its generated cross-language JSON Schema is `projects/game-data-exporter/schemas/config/level-progression-target-profile.schema.json`.
The compiler rechecks the target profile and every evidence input immediately before writing the output.
The output records the profile filename, byte length, SHA-256 hash, and profile type.
The artifact records `runtimeValidation: not-run` because the normalized state and control flow come from static evidence.
It does not claim the exact player-visible maximum-level presentation.
The generated artifact remains private and is not committed.

## 26. Compile the daily movie Market

This step consumes a private reviewed Market research input plus every evidence file named by that input.
The command verifies each evidence filename, artifact type, game build, byte length, and SHA-256 hash before compilation.
The research input records the static interpretations established by the Market acquisition runs.

The output derives the full daily movie-attempt and bundle-count distributions, bundle-size probabilities, and reachable candidate totals.
It also records saved-Market restoration, first-save-day bundle calls, clearing behavior, generated release-date, rarity, and critic-score rules, bundle price tiers, the individual movie-price formula, and movie and bundle purchase outcomes.
The evidence level is `curated-static-analysis`, and runtime validation remains `not-run`.

Move into the TypeScript workspace and install its locked dependencies.

```powershell
Push-Location projects/typescript
pnpm install --frozen-lockfile
```

```bash
pushd projects/typescript >/dev/null
pnpm install --frozen-lockfile
```

Pass every evidence file listed by the private research input as a repeated `--source` option.

```powershell
pnpm market-mechanics `
  --research (Join-Path $domainDirectory "market-mechanics-research.json") `
  --source $marketEvidence `
  --source $structuredValues `
  --source $marketGenerationTrace `
  --source $marketPricingTrace `
  --source $marketPurchaseTrace `
  --output (Join-Path $domainDirectory "market-mechanics.json")
```

```bash
pnpm market-mechanics \
  --research "$domainDirectory/market-mechanics-research.json" \
  --source "$marketEvidence" \
  --source "$structuredValues" \
  --source "$marketGenerationTrace" \
  --source "$marketPricingTrace" \
  --source "$marketPurchaseTrace" \
  --output "$domainDirectory/market-mechanics.json"
```

The examples abbreviate the source list.
The real command must provide each file declared by the research input exactly once.

Return to the repository root when the command finishes.

```powershell
Pop-Location
```

```bash
popd >/dev/null
```

The executable input and output contracts are `MarketMechanicsResearchSchema` and `MarketMechanicsSchema` in `projects/typescript/packages/core/src/contracts/domain/market-mechanics.ts`.
Both contracts are TypeScript-only and do not produce standalone JSON Schema.
The compiler rechecks the research input and every evidence file immediately before immutable output.
The generated artifacts remain private and are not committed.

## 27. Compile the Market value analysis

This step combines the film catalog, normalized Market mechanics, and the exact structured-values files behind both artifacts.
The compiler requires one game build and proves that both structured-values files contain the same data-table payload before using source row order.

The output records every regular film's generated release date, rarity, critic score, seeded price inputs, exact price, and Market reachability.
It also summarizes reachable prices by genre and rarity and calculates the non-free bundle price per successfully delivered movie for every positive possible count.

Move into the TypeScript workspace after compiling the film catalog and Market mechanics.

```powershell
Push-Location projects/typescript
pnpm market-value-analysis `
  --catalog $filmCatalog `
  --mechanics $marketMechanics `
  --catalog-structured-values $catalogStructuredValues `
  --mechanics-structured-values $mechanicsStructuredValues `
  --output (Join-Path $domainDirectory "market-value-analysis.json")
Pop-Location
```

```bash
pushd projects/typescript >/dev/null
pnpm market-value-analysis \
  --catalog "$filmCatalog" \
  --mechanics "$marketMechanics" \
  --catalog-structured-values "$catalogStructuredValues" \
  --mechanics-structured-values "$mechanicsStructuredValues" \
  --output "$domainDirectory/market-value-analysis.json"
popd >/dev/null
```

The executable output contract is `MarketValueAnalysisSchema` in `projects/typescript/packages/core/src/contracts/domain/market-value-analysis.ts`.
The compiler reproduces Unreal Engine 5.4 `FRandomStream` integer draws and checks source identities, source row coverage, candidate totals, and price mappings.
It rechecks every input immediately before immutable output.
The generated artifact remains private and is not committed.

## 28. Compile the Market guide findings

This step combines the normalized Market mechanics and Market value analysis into one source-bound record for future guide content.
It summarizes daily availability, exact selection exclusions, individual acquisition costs, configured bundle targets, underfilled bundle tier jumps, and purchase failure behavior.

The output labels availability, selection, and acquisition-cost claims as eligible for the studied build.
It keeps realized bundle composition and delivery conditional until runtime validation and does not infer profit recommendations from inputs that contain no income or demand evidence.

Move into the TypeScript workspace after compiling the Market mechanics and value analysis.

```powershell
Push-Location projects/typescript
$marketMechanics = Join-Path $domainDirectory "market-mechanics.json"
$marketValueAnalysis = Join-Path $domainDirectory "market-value-analysis.json"
pnpm market-guide-findings `
  --mechanics $marketMechanics `
  --values $marketValueAnalysis `
  --output (Join-Path $domainDirectory "market-guide-findings.json")
Pop-Location
```

```bash
pushd projects/typescript >/dev/null
marketMechanics="$domainDirectory/market-mechanics.json"
marketValueAnalysis="$domainDirectory/market-value-analysis.json"
pnpm market-guide-findings \
  --mechanics "$marketMechanics" \
  --values "$marketValueAnalysis" \
  --output "$domainDirectory/market-guide-findings.json"
popd >/dev/null
```

The executable output contract is `MarketGuideFindingsSchema` in `projects/typescript/packages/core/src/contracts/domain/market-guide-findings.ts`.
The compiler verifies the source identity link between its inputs, their build, film classifications, price summary, probability distributions, and bundle targets.
It rechecks both inputs immediately before immutable output.
The generated artifact remains private and is not committed.

## 29. Compile checkout income

This step consumes a private reviewed checkout research input and the exact selected-function traces named by that input.
The command validates each trace with its canonical contract, then verifies every filename, artifact type, build, byte length, and SHA-256 hash.

The output derives cartridge rental prices in pennies, the complete tender probability distribution, available returned-cash denominations, balance mutations, transaction-finalization behavior, and the completed net-income rule.
It records that exact change makes net revenue equal the bill and that excess change is accepted and can reduce core money below zero.
It preserves cartridge base-price precedence and marks the raw special-genre label unresolved instead of inventing a player-facing name.
Runtime presentation remains conditional until controlled validation.

Move into the TypeScript workspace after producing the checkout traces and private research input.

```powershell
Push-Location projects/typescript
$checkoutResearch = Join-Path $domainDirectory "checkout-income-research.json"
pnpm checkout-income `
  --research $checkoutResearch `
  --source $checkoutPriceTrace `
  --source $checkoutCashTrace `
  --output (Join-Path $domainDirectory "checkout-income.json")
Pop-Location
```

```bash
pushd projects/typescript >/dev/null
pnpm checkout-income \
  --research "$domainDirectory/checkout-income-research.json" \
  --source "$checkoutPriceTrace" \
  --source "$checkoutCashTrace" \
  --output "$domainDirectory/checkout-income.json"
popd >/dev/null
```

The executable input and output contracts are `CheckoutIncomeResearchSchema` and `CheckoutIncomeSchema` in `projects/typescript/packages/core/src/contracts/domain/checkout-income.ts`.
The compiler derives unconditional tender probabilities from the conditional decision tree and checks that the probabilities total one.
It rejects duplicate evidence, duplicate denominations, an incomplete tender fallback, unavailable rounded denominations, changed finalization order, changed source identities, or inputs from another build.
The generated artifacts remain private and are not committed.

## 30. Compile Market rental economics

This step joins normalized per-SKU Market values, Market guide findings, checkout income, and a private reviewed classification record.
The classification record binds the exact film-to-cartridge traces, complete property and call-site scans, and movie-genre enum by filename, artifact type, build, byte length, and SHA-256 hash.

The output includes every reachable regular Market film from the ordinary and explicit-only routes.
For each SKU, it records acquisition cost, the checkout base-price branch, the exclusive-print surcharge, exact-change rental revenue, and the number of exact-change rentals needed to recover the acquisition cost.
It preserves the Adult branch priority over the old-film branch.

The recovery count is a cost-recovery scenario, not an expected-profit forecast.
The inputs do not establish how often a film is rented or how much change the player actually returns.

Move into the TypeScript workspace after producing the classification evidence and private research input.

```powershell
Push-Location projects/typescript
$rentalResearch = Join-Path $domainDirectory "market-rental-economics-research.json"
$marketValueAnalysis = Join-Path $domainDirectory "market-value-analysis.json"
$marketGuideFindings = Join-Path $domainDirectory "market-guide-findings.json"
$checkoutIncome = Join-Path $domainDirectory "checkout-income.json"
pnpm market-rental-economics `
  --research $rentalResearch `
  --values $marketValueAnalysis `
  --findings $marketGuideFindings `
  --income $checkoutIncome `
  --source $classificationReaders `
  --source $filmIsNewTrace `
  --source $productStructureReferences `
  --source $cartridgeProductPath `
  --source $spawnMovieCallSites `
  --source $marketPurchaseSpawn `
  --source $createFilmDataTrace `
  --source $movieGenreEnum `
  --output (Join-Path $domainDirectory "market-rental-economics.json")
Pop-Location
```

```bash
pushd projects/typescript >/dev/null
marketValueAnalysis="$domainDirectory/market-value-analysis.json"
marketGuideFindings="$domainDirectory/market-guide-findings.json"
checkoutIncome="$domainDirectory/checkout-income.json"
pnpm market-rental-economics \
  --research "$domainDirectory/market-rental-economics-research.json" \
  --values "$marketValueAnalysis" \
  --findings "$marketGuideFindings" \
  --income "$checkoutIncome" \
  --source "$classificationReaders" \
  --source "$filmIsNewTrace" \
  --source "$productStructureReferences" \
  --source "$cartridgeProductPath" \
  --source "$spawnMovieCallSites" \
  --source "$marketPurchaseSpawn" \
  --source "$createFilmDataTrace" \
  --source "$movieGenreEnum" \
  --output "$domainDirectory/market-rental-economics.json"
popd >/dev/null
```

The executable input and output contracts are `MarketRentalEconomicsResearchSchema` and `MarketRentalEconomicsSchema` in `projects/typescript/packages/core/src/contracts/domain/market-rental-economics.ts`.
The compiler verifies all four normalized inputs are from one build, verifies that the guide findings identify the supplied value analysis, validates all eight classification sources through their canonical contracts, and rechecks every input immediately before immutable output.
The generated artifacts remain private and are not committed.

## Next step

Research demand and rental frequency before turning acquisition-cost recovery into profit or stocking recommendations.
Runtime collection remains necessary only for claims that require controlled observation.
See [runtime preparation](/docs/runtime-preparation-workflow.md) and the [movie-return observation case](/docs/movie-return-runtime-observation.md).

[Research overview](/docs/research-overview.md)
