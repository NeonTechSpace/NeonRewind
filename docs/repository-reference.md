# Repository reference

Troubleshooting, artifact ownership, repository layout, licensing, and the project disclaimer live here.

[Documentation overview](README.md)

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

Original NeonRetroRewind source code is licensed under the [Apache License 2.0](../LICENSE).
NeonRetroRewind is provided as is, without warranty of any kind, to the extent permitted by applicable law.
The licence contains the complete warranty disclaimer and limitation of liability.

## Disclaimer

NeonRetroRewind is an unofficial fan project and is not affiliated with or endorsed by the developers or publishers of *Retro Rewind: Video Store Simulator*.
The game and its related names and assets belong to their respective owners.

[Documentation overview](README.md)
