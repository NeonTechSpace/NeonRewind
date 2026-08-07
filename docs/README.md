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

## License

Original NeonRewind source code is licensed under the [Apache License 2.0](LICENSE).
NeonRewind is provided as is, without warranty of any kind, to the extent permitted by applicable law.
The licence contains the complete warranty disclaimer and limitation of liability.

## Disclaimer

NeonRewind is an unofficial fan project and is not affiliated with or endorsed by the developers or publishers of *Retro Rewind: Video Store Simulator*.
The game and its related names and assets belong to their respective owners.
