# How NeonRetroRewind researches the game

This page explains the research process from the beginning.
It is for readers who want to understand where NeonRetroRewind's answers come from before learning any tools or commands.

No knowledge of programming, Unreal Engine, or game files is required.

[Project overview](README.md) · [Contributor guide](repository-reference.md) · [First command guide](portable-tool-setup.md)

## Why the project does research

A game guide can repeat what players have observed, or it can check how the game actually makes a decision.
NeonRetroRewind uses both approaches when needed.

For example, a player may notice that customers sometimes return movies.
That observation alone may not reveal which movies are eligible, how many can be returned, or what happens when no movie qualifies.
The project studies the relevant game information, writes down the rule in a consistent form, and checks the result in the running game when the files leave an important question open.

## The process in one view

1. Identify the exact version of the game being studied
2. Read only the game files relevant to one question
3. Turn the useful findings into small, consistent records
4. Check uncertain behavior in the running game when necessary
5. Use supported findings as the basis for guide information

The first three steps are called static research because the game does not need to be running.
The fourth step is called runtime research because it observes the game while a person plays it.

Most questions should begin with static research.
Runtime research is more difficult and is used only when it can answer something the files cannot establish on their own.

## Important terms

The command guides use the following terms.
They are introduced here in the order a new researcher encounters them.

### Game build

A game build is one specific published version of the game.
An update can change data or behavior, so every research result must identify the exact build it came from.

### Game package

Unreal Engine stores shipped game content in package files.
NeonRetroRewind reads selected information from the packages in a contributor's licensed installation.
It does not publish those packages or the information copied from them.

### Mapping

A packaged Unreal game can store information in a compact form that no longer includes every original name and type.
A mapping file helps a reader reconstruct those missing descriptions for one exact game build.
A mapping from another build can produce incorrect results and must not be reused.

### Blueprint

A Blueprint is an Unreal Engine visual script used to define game behavior.
The shipped game contains a compiled form of that script rather than the original editor graph.
NeonRetroRewind can inspect selected compiled Blueprint functions and produce a readable trace of their important operations.

### Evidence

Evidence is a focused result collected from the game for one research question.
It can record a value, a function, a relationship, or an observed state change.
Private evidence keeps a link to the exact build and source location so a conclusion can be checked later.

### Artifact

An artifact is a file produced by one research step and consumed by another.
Most NeonRetroRewind artifacts are JSON files, which are structured text files that software can validate and read.

### Schema

A schema defines the required shape of an artifact.
It catches missing, unexpected, or wrongly typed information before a later step treats that information as evidence.

### Normalized record

Raw evidence often mirrors the way the game stores information.
A normalized record rewrites the supported facts into a stable shape owned by NeonRetroRewind.
This lets future guide code use one clear meaning without depending directly on the game's internal layout.

### Runtime observation

A runtime observation is a small record of one selected behavior while the game is running.
The player controls the game normally.
The collector records only the state needed to test the chosen rule.

## Static research from start to finish

Static research does not launch the game or change the installation.

1. The build check records which executable and package files are being studied
2. A census records which packages can be read and where potentially relevant information exists
3. Focused extraction reads only the classes, values, or functions needed for the question
4. Blueprint analysis turns selected compiled functions into readable and typed traces
5. A compiler validates the evidence and writes a normalized NeonRetroRewind record

The numbered commands are split across three guides because each stage requires more knowledge than the previous one:

1. [Static acquisition](static-acquisition-workflow.md)
2. [Blueprint analysis](blueprint-analysis-workflow.md)
3. [Domain compilation](domain-compilation-workflow.md)

You can stop after an earlier stage if it already answers the research question.

## When runtime research is needed

Compiled game files can show values and logic, but they do not always prove how several systems behave together during play.
A runtime observation can test that boundary.

Runtime work is justified only when all of the following are true:

- A specific question remains after static research
- The observation can be limited to the state needed for that question
- The person running the game can review and control every installation and cleanup action
- The result can be validated against an existing normalized record

The movie-return observation is the first implemented example.
It checks whether selected state changes in a real play session agree with the movie-return record recovered from the game files.

Read these pages only if you are working on that specialized path:

1. [Runtime preparation](runtime-preparation-workflow.md)
2. [Movie-return runtime observation](movie-return-runtime-observation.md)
3. [Movie-return runtime host design](movie-return-runtime-host.md)
4. [Native collector build](../projects/game-data-exporter/runtime-collector/README.md)

## What stays private

The public repository contains NeonRetroRewind's own code, schemas, documentation, and invented test fixtures.

The following material stays in local directories ignored by Git:

- Game packages, executables, and mapping files
- Values, text, scripts, or assets extracted from the game
- Normalized records derived from the game
- Runtime observations, logs, and validation reports
- Built research binaries that depend on game or private tool material

This boundary allows the research method to be public without redistributing the game or its derived content.

## Choose the next page

If you want to work on the repository without collecting game evidence, continue with the [contributor guide](repository-reference.md).

If you want to reproduce the research and do not have the required development tools, continue with [portable local tool setup](portable-tool-setup.md).

If your tools are already available and you understand the terms above, continue with [static acquisition](static-acquisition-workflow.md).
