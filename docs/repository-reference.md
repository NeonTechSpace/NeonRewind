# Contributor and repository guide

This page explains what is currently built, how the repository is organized, and how to run its normal development checks.
A repository is the folder that holds the project's source code, tests, and documentation.

Start with the [project overview](/docs/README.md) if you only want to understand what NeonRetroRewind is.
Read the [research overview](/docs/research-overview.md) before working with game files or research artifacts.

## Who this page is for

Use this page if you want to change NeonRetroRewind's code or understand where an existing feature belongs.
You do not need a copy of the game to work on most public code and tests.

The later research command guides are separate because they require a licensed game installation and more specialized knowledge.

## Current implementation

| Area | Current state |
|---|---|
| Public guide and website | Not built |
| Reading game files while the game is closed | Implemented for focused data and selected game logic |
| Stable NeonRetroRewind research records | Film catalog, console-return, membership-fee, movie-return, new-release, level-progression, daily movie Market, and Market value compilers exist |
| Checking behavior while the game runs | One bounded movie-return collector and validator exist, with one passing user-operated observation |
| Level progression | A normalized compiler records XP thresholds, gameplay, movie-category, and game-category unlock labels, capped experience updates, requirement lookup, and end-of-day level transitions from typed evidence |
| Daily movie Market | A normalized compiler records daily supply odds, reachable candidate counts, generated release-date, rarity, and critic-score rules, bundle sizes and prices, movie pricing, and purchase outcomes from a private reviewed research input bound to exact evidence files |
| Market value analysis | A private compiler reproduces Unreal Engine 5.4 seeded film values, identifies unreachable final source rows, summarizes reachable prices, and calculates bundle cost per successfully delivered movie |
| Market source evidence | A build-bound extractor records the selected manager and save shapes that feed the normalized Market compiler, while player recommendations remain unwritten |
| Public calculator | Not planned as part of the current read-only guide |

The repository is useful today as a research and validation codebase.
It is not yet a player-facing product.

## How the repository works

NeonRetroRewind separates collecting information, turning it into project records, and checking uncertain behavior.

1. The C# research tools read focused information from a licensed local game installation
2. The TypeScript compilers check that information and create stable NeonRetroRewind records
3. The validator compares selected records with small observations from the running game
4. The future guide can use findings that have enough evidence for their intended claim

Raw game-derived evidence does not become public repository content.
Public tests use invented fixtures.
Exact game identifiers, cooked paths, and source offsets are also private evidence.
Public examples use synthetic values, while real target profiles stay in ignored `.local` directories.

The [research overview](/docs/research-overview.md) defines the specialist terms and explains why each stage exists.

## Repository areas

| Path | Responsibility |
|---|---|
| `docs` | Public project, research, and validation documentation |
| `projects/game-data-exporter/static-extractor` | .NET 10 tools for build identity, focused rental, unlockable, statistic, progression-enum, and Market extraction, and selected Blueprint analysis |
| `projects/game-data-exporter/runtime-exporter` | Offline staging, installation preview, and cleanup commands for runtime probes and collectors |
| `projects/game-data-exporter/runtime-collector` | The bounded native movie-return collector and its local build tools |
| `projects/game-data-exporter/schemas` | JSON Schemas retained for real .NET, C++, and cross-language configuration boundaries |
| `projects/typescript/packages/core` | Canonical ArkType artifact contracts and inferred public types |
| `projects/typescript/packages/data-compiler` | Validation and compilation of private evidence into normalized records |
| `projects/typescript/packages/validator` | Comparison of runtime observations with normalized mechanics |

The C# projects are separate from the pnpm workspace.
The TypeScript workspace begins at `projects/typescript`.

## Development requirements

The TypeScript workspace uses:

- Node.js `24.19.0`
- pnpm `11.x`
- TypeScript `7.0.2`

The C# acquisition and runtime-host projects target .NET 10.
The native runtime collector has additional pinned tools and private dependency requirements described in its [build guide](/projects/game-data-exporter/runtime-collector/README.md).

A game installation is not required for TypeScript checks or tests.
It is required only when collecting new game evidence or performing runtime validation.

## TypeScript development

Run these commands from `projects/typescript`.

Install the locked dependencies:

```text
pnpm install --frozen-lockfile
```

Check TypeScript types:

```text
pnpm check
```

Run all current TypeScript tests:

```text
pnpm test
```

Run package build scripts where they exist:

```text
pnpm build
```

When the level-progression target-profile contract changes, regenerate its cross-language JSON Schema:

```text
pnpm --filter @neonretrorewind/core generate:level-progression-target-profile-schema
```

When the Market-evidence target-profile contract changes, regenerate its cross-language JSON Schema:

```text
pnpm --filter @neonretrorewind/core generate:market-evidence-target-profile-schema
```

There is no single repository-wide command that also builds both .NET projects and the native collector.
Use the owning workflow for those components.

## Research workflows

The research pages are advanced operational documentation.
Read the [prerequisite-free research overview](/docs/research-overview.md) before using them.
They are ordered by dependency:

1. [Portable local tool setup](/docs/portable-tool-setup.md)
2. [Static acquisition](/docs/static-acquisition-workflow.md)
3. [Blueprint analysis](/docs/blueprint-analysis-workflow.md)
4. [Domain compilation](/docs/domain-compilation-workflow.md)
5. [Runtime preparation](/docs/runtime-preparation-workflow.md), only when controlled observation is required

The [movie-return runtime observation](/docs/movie-return-runtime-observation.md) is the implemented validation case.
The [runtime-host design](/docs/movie-return-runtime-host.md) records its installation and cleanup boundaries.

## Local and boundary files

- `projects/game-data-exporter/.local` contains private acquisition, runtime, and native-build state
- `projects/game-data-exporter/.local/targets` contains private build-bound target profiles
- `projects/typescript/.local` contains private compiled records and validation reports
- `projects/typescript/node_modules` contains installed workspace dependencies
- `projects/game-data-exporter/schemas` contains the observation, collector-config, and target-profile cross-language schemas
- `projects/typescript/packages/core/schemas` contains the movie-return mechanics cross-language schema

The `.local` directories and build outputs are ignored by Git.
The five cross-language schemas are tracked because .NET or C++ reads them directly.

## Artifact contracts

`@neonretrorewind/core` owns one executable ArkType contract for every acquisition, domain, runtime, and validation artifact.
Public TypeScript types are inferred from those contracts rather than maintained as separate handwritten interfaces.

Standalone JSON Schema exists only for the movie-return observation, runtime collector config, movie-return mechanics, and two target-profile files that cross .NET, C++, and TypeScript boundaries.
TypeScript validates every artifact through the contract imported from `@neonretrorewind/core` and does not accept schema paths on its command lines.
Public TypeScript types are inferred directly from the same ArkType definitions.
When one of the five cross-language files changes, update its boundary schema and the shared behavior tests in the same change.

## Common problems

### A command says that a file does not exist

Check the path variables required by the workflow and run its path setup block again.
Paths containing spaces are safe when passed through the documented variables.

### An artifact conflicts with an existing file

Artifact commands accept identical existing content but do not replace different content.
Use a new generation directory for a new run or changed input.

### The structured index rejects the mapping

Confirm that the `.usmap` mapping came from the same executable recorded by the build manifest.
The repository cannot repair or convert a mapping from another game build.

### `pnpm` is not recognized

Install pnpm `11.x`, open a new shell, and run `pnpm --version` again.
The [portable setup](/docs/portable-tool-setup.md) provides a local alternative to a system-wide installation.

## License

Original NeonRetroRewind source code is licensed under the [Apache License 2.0](/LICENSE).
NeonRetroRewind is provided as is, without warranty of any kind, to the extent permitted by applicable law.
The licence contains the complete warranty disclaimer and limitation of liability.

## Disclaimer

NeonRetroRewind is an unofficial fan project and is not affiliated with or endorsed by the developers or publishers of *Retro Rewind: Video Store Simulator*.
The game and its related names and assets belong to their respective owners.

[Return to the project overview](/docs/README.md)
