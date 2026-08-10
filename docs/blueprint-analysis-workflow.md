# Blueprint analysis workflow

This workflow decompiles selected cooked Blueprint functions, discovers exact call sites, and converts the selected functions into typed Kismet traces. Complete the [static acquisition workflow](static-acquisition-workflow.md) first.

[Documentation overview](README.md) · [Previous: static acquisition](static-acquisition-workflow.md) · [Next: domain compilation](domain-compilation-workflow.md)

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

## 16. Trace an explicit call candidate

This step binds one exact call node from a Blueprint property-reference trace to one explicitly selected function on the same cooked class.
It records the call signature, the candidate parameter signature, and the candidate's typed Kismet body.
The output always labels the relationship `unproven`, even when a name, parameter count, or control-flow fragment is similar.

```powershell
$marketClass = "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C:"

dotnet run --project $extractor -- blueprint-call-candidate-trace `
  --build-manifest (Join-Path $buildDirectory "build-manifest.json") `
  --source-trace (Join-Path $buildDirectory "blueprint-property-reference-trace.new-release-candidates.json") `
  --caller-function-path ($marketClass + "Filter Example Schedule") `
  --statement-index 152 `
  --expected-call-kind "local-virtual" `
  --expected-call-function "Evaluate Example Record" `
  --expected-argument-count 4 `
  --candidate-function-path ($marketClass + "Evaluate Example Schedule") `
  --mappings $mappings `
  --package-directory $packageDirectory `
  --output (Join-Path $buildDirectory "blueprint-call-candidate-trace.return-if-new-movie-release-today.json")
```

```bash
marketClass="ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C:"

dotnet run --project "$extractor" -- blueprint-call-candidate-trace \
  --build-manifest "$buildDirectory/build-manifest.json" \
  --source-trace "$buildDirectory/blueprint-property-reference-trace.new-release-candidates.json" \
  --caller-function-path "${marketClass}Filter Example Schedule" \
  --statement-index 152 \
  --expected-call-kind "local-virtual" \
  --expected-call-function "Evaluate Example Record" \
  --expected-argument-count 4 \
  --candidate-function-path "${marketClass}Evaluate Example Schedule" \
  --mappings "$mappings" \
  --package-directory "$packageDirectory" \
  --output "$buildDirectory/blueprint-call-candidate-trace.return-if-new-movie-release-today.json"
```

Use statement indexes and paths from the source trace rather than copying the example into another build.
The source trace, manifest, mapping, and packages must all have matching identities.
The output contains game-specific signature and bytecode evidence and must remain in the ignored local acquisition directory.

## 17. Create the typed rental function trace

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

## Next step

Continue with [domain compilation](domain-compilation-workflow.md) after the required typed traces exist.

[Documentation overview](README.md)
