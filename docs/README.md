# NeonRetroRewind

NeonRetroRewind is an unofficial, open-source research and data project for *Retro Rewind: Video Store Simulator*.

The repository currently provides build-identified Unreal data acquisition, canonical ArkType artifact contracts, generated JSON Schema for cross-language boundaries, normalized film and mechanic compilers, and a bounded movie-return runtime collector and validator. The public guide and website have not been built yet.

## Current status

- Static acquisition reads a user-owned Steam installation and produces ignored, immutable evidence artifacts.
- The normalized film catalog covers the game's 13 catalog tables.
- Rental, membership-fee, movie-return, and new-release request mechanics have typed or normalized evidence.
- A user-operated movie-return observation for Steam build `23896268` completed and passed semantic validation.
- Exact membership and expiry for the still-new movie candidate map remain unresolved. A complete scan of build `23896268` found the serialized four-argument `Evaluate Example Record` call's exact four-parameter declaration on the `ExampleRecord_C` Blueprint function library. Its body and the call's resolution to that external owner have not yet been traced. The similarly named `ExampleManager_C:Evaluate Example Schedule` declaration has one Boolean output parameter and remains a distinct function.
- No public guide, calculator, or website exists.

## Documentation

Start with the page that matches the work you need:

| Document | Purpose |
|---|---|
| [Static acquisition workflow](docs/static-acquisition-workflow.md) | Build identity, census, mappings, structured values, and subsystem evidence |
| [Blueprint analysis workflow](docs/blueprint-analysis-workflow.md) | Caller discovery, Blueprint bodies, event-graph entrypoints, and typed Kismet traces |
| [Domain compilation workflow](docs/domain-compilation-workflow.md) | Compile console-return, membership-fee, movie-return, new-release, and film-catalog artifacts |
| [Runtime preparation workflow](docs/runtime-preparation-workflow.md) | Prepare the compatibility probe and collector payload without starting or modifying the game automatically |
| [Portable local tool setup](docs/portable-tool-setup.md) | Use pinned local .NET, Node.js, and pnpm tools without a system-wide installation |
| [Movie-return runtime host](docs/movie-return-runtime-host.md) | Runtime-host compatibility, staging, installation, cleanup, and ownership rules |
| [Movie-return runtime observation](docs/movie-return-runtime-observation.md) | Observation contract, validation case, passed run, and evidence linking |
| [Repository reference](docs/repository-reference.md) | Troubleshooting, artifact contracts, repository layout, license, and disclaimer |
| [Runtime collector build](projects/game-data-exporter/runtime-collector/README.md) | Build the bounded UE4SS C++ collector from pinned sources |

## Data and distribution boundary

The repository contains source code, generated boundary schemas, normalization logic, and instructions. Users provide their own licensed game installation and run acquisition locally.

Do not commit or publish:

- Compiled extractor or collector binaries
- Game binaries, package files, mappings, or saves
- Build manifests, censuses, extracted values, or Blueprint-derived evidence
- Compiled catalogs, mechanic artifacts, runtime observations, validation reports, or extracted game text
- Extracted or modified game assets

The documented output directories are ignored by Git.

## Workflow at a glance

1. Follow [portable tool setup](docs/portable-tool-setup.md).
2. Run the [static acquisition workflow](docs/static-acquisition-workflow.md) against one exact game build.
3. Produce focused cooked-function evidence with the [Blueprint analysis workflow](docs/blueprint-analysis-workflow.md).
4. Compile private normalized artifacts with the [domain workflow](docs/domain-compilation-workflow.md).
5. Use the [runtime workflow](docs/runtime-preparation-workflow.md) only when a mechanic requires controlled in-game observation.
6. Keep all generated game-derived data in the ignored local directories described by the workflow.

See the [repository reference](docs/repository-reference.md) for contract ownership, troubleshooting, layout, licensing, and the project disclaimer.
