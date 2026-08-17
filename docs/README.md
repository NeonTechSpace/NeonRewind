# NeonRetroRewind

NeonRetroRewind is an unofficial project that is building an accurate guide to *Retro Rewind: Video Store Simulator*.
The goal is to answer player questions with information checked against the game instead of guesses or incomplete recollection.

> [!IMPORTANT]
> There is no public NeonRetroRewind guide or website yet.
> This repository currently contains the software and research instructions used to discover and verify guide information.

## Current project state

NeonRetroRewind is currently a research and validation codebase.
It is not yet a player-facing product.

The repository contains tools that identify an installed game build, collect focused facts from game files, convert selected evidence into stable project records, and check one bounded movie-return case while the game runs.
Implemented records cover the film catalog, console returns, membership fees, movie returns, new releases, level progression, and the daily movie Market.
The daily Market record is compiled from reviewed private research bound to exact source artifacts.

The generated research artifacts are kept private because they contain information from game files.
Supported findings can later be written as guide information.
The public repository contains NeonRetroRewind's own source code, documentation, and tests made with invented examples.

You do not need to understand the research tools to follow the project or contribute to its future guide.

## Start with what you want to do

### I want to understand the project

Read the [contributor and repository guide](/docs/repository-reference.md).
It explains what is built, what is not built, and where the main parts live.

### I want to understand how the research works

Read [How NeonRetroRewind researches the game](/docs/research-overview.md).
It introduces every important term without assuming knowledge of Unreal Engine, data extraction, or runtime tools.

### I want to run the research tools

Start with the research overview before following any command guide.
The command guides are ordered from the most generally useful workflow to the most specialized one.

1. [Prepare portable local tools](/docs/portable-tool-setup.md)
2. [Collect evidence from game files](/docs/static-acquisition-workflow.md)
3. [Analyze selected visual game scripts](/docs/blueprint-analysis-workflow.md)
4. [Convert evidence into stable project records](/docs/domain-compilation-workflow.md)
5. [Prepare a runtime check when file research is not enough](/docs/runtime-preparation-workflow.md)

Runtime validation is optional and advanced.
The [movie-return observation](/docs/movie-return-runtime-observation.md), [runtime-host design](/docs/movie-return-runtime-host.md), and [native collector build](/projects/game-data-exporter/runtime-collector/README.md) document the first implemented case.

## How an answer reaches the future guide

1. A contributor starts with a licensed copy of one exact game version
2. NeonRetroRewind tools collect only the information needed for a specific question
3. The project converts that information into a consistent record with links back to its source
4. A controlled in-game check is used only when the files cannot answer the question reliably
5. A supported finding can become guide information

Each layer requires more technical knowledge than the one before it.
Readers can stop as soon as they have the information they need.

## Data and distribution boundary

Game files and information copied from them must never be committed to or published from this repository.
Users provide their own licensed installation, and all generated game-derived output stays in ignored local directories.

Do not commit or publish:

- Compiled extractor or collector binaries
- Game binaries, package files, mappings, or saves
- Exact game asset, object, class, function, property, enum, or table identifiers
- Cooked package paths, statement indexes, entry points, or other source locators
- Extracted values, game logic, runtime observations, or validation reports
- Compiled catalogs or mechanic records derived from the game
- Extracted or modified game assets or text

Public source, documentation, and tests may use clearly synthetic identifiers and locators to exercise generic tooling and normalized algorithms.
Real target profiles and source evidence belong only in ignored local directories.

## License

Original NeonRetroRewind source code is licensed under the [Apache License 2.0](/LICENSE).

## Disclaimer

NeonRetroRewind is an unofficial fan project and is not affiliated with or endorsed by the developers or publishers of *Retro Rewind: Video Store Simulator*.
The game and its related names and assets belong to their respective owners.
