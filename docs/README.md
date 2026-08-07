# NeonRewind

NeonRewind is an unofficial, open-source project for *Retro Rewind: Video Store Simulator*.

## Repository

- `projects/game-data-exporter/static-extractor` contains a .NET 10 and CUE4Parse package-access probe.
- `projects/game-data-exporter/runtime-exporter` and `projects/game-data-exporter/schemas` are scaffolds.
- `projects/typescript` is a pnpm workspace containing `core`, `data-compiler`, and `validator` packages.

## Static extractor

Run the probe with a directory containing the game's `.pak` or `.utoc` files.

```powershell
dotnet run --project projects/game-data-exporter/static-extractor/NeonRewind.StaticExtractor.csproj -- <package-directory>
```

```bash
dotnet run --project projects/game-data-exporter/static-extractor/NeonRewind.StaticExtractor.csproj -- '<package-directory>'
```

The probe uses the configured Unreal Engine 5.4 profile and reports container, file, and Unreal package counts.
It does not extract or normalize game data.

Generate a versioned build manifest from an installed Steam build.

```powershell
dotnet run --project projects/game-data-exporter/static-extractor/NeonRewind.StaticExtractor.csproj -- manifest --steam-manifest <path> --executable <path> --package <path> --output <path>
```

```bash
dotnet run --project projects/game-data-exporter/static-extractor/NeonRewind.StaticExtractor.csproj -- manifest --steam-manifest '<path>' --executable '<path>' --package '<path>' --output '<path>'
```

Repeat `--package <path>` when a build uses multiple package-container files.
The output records Steam build identity, executable and package hashes, the configured engine profile, and extractor versions.
The command leaves an identical existing manifest unchanged and refuses to overwrite different content.

Generate a deterministic file, package, and export-class census for a build manifest.

```powershell
dotnet run --project projects/game-data-exporter/static-extractor/NeonRewind.StaticExtractor.csproj -- census --build-manifest <path> --package-directory <path> --output <path>
```

```bash
dotnet run --project projects/game-data-exporter/static-extractor/NeonRewind.StaticExtractor.csproj -- census --build-manifest '<path>' --package-directory '<path>' --output '<path>'
```

The census verifies package hashes before and after scanning and records package parse failures without local paths or exception messages.

Generate a mapped index of DataTables, StringTables, and direct data-asset candidates from a static census.

```powershell
dotnet run --project projects/game-data-exporter/static-extractor/NeonRewind.StaticExtractor.csproj -- structured-index --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --output <path>
```

```bash
dotnet run --project projects/game-data-exporter/static-extractor/NeonRewind.StaticExtractor.csproj -- structured-index --build-manifest '<path>' --static-census '<path>' --mappings '<path>' --package-directory '<path>' --output '<path>'
```

The structured index verifies every input before and after parsing, fully deserializes candidate packages, and records table entry counts and failures without copying row values.

## License

Original NeonRewind source code is licensed under the [Apache License 2.0](LICENSE).
NeonRewind is provided as is, without warranty of any kind, to the extent permitted by applicable law.
The licence contains the complete warranty disclaimer and limitation of liability.

## Disclaimer

NeonRewind is an unofficial fan project and is not affiliated with or endorsed by the developers or publishers of *Retro Rewind: Video Store Simulator*.
The game and its related names and assets belong to their respective owners.
