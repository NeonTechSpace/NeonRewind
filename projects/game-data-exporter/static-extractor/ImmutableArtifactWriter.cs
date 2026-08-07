using System.Text;

namespace NeonRewind.StaticExtractor;

internal enum ArtifactWriteStatus
{
    Created,
    Unchanged,
    Conflict,
}

internal static class ImmutableArtifactWriter
{
    private static readonly UTF8Encoding Utf8WithoutBom = new(false);

    public static ArtifactWriteStatus Write(string outputPath, string content, string artifactName)
    {
        var resolvedOutputPath = Path.GetFullPath(outputPath);
        var outputDirectory = Path.GetDirectoryName(resolvedOutputPath);

        if (string.IsNullOrEmpty(outputDirectory) || !Directory.Exists(outputDirectory))
        {
            throw new IOException($"Output directory does not exist: {outputDirectory}");
        }

        if (File.Exists(resolvedOutputPath))
        {
            var existingContent = File.ReadAllText(resolvedOutputPath, Encoding.UTF8);
            if (string.Equals(existingContent, content, StringComparison.Ordinal))
            {
                Console.WriteLine($"{artifactName} is unchanged: {resolvedOutputPath}");
                return ArtifactWriteStatus.Unchanged;
            }

            Console.Error.WriteLine($"Refusing to overwrite a different {artifactName.ToLowerInvariant()}: {resolvedOutputPath}");
            return ArtifactWriteStatus.Conflict;
        }

        var temporaryPath = resolvedOutputPath + $".{Environment.ProcessId}.{Guid.NewGuid():N}.tmp";

        try
        {
            File.WriteAllText(temporaryPath, content, Utf8WithoutBom);
            File.Move(temporaryPath, resolvedOutputPath);
        }
        finally
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }
        }

        Console.WriteLine($"Wrote {artifactName.ToLowerInvariant()}: {resolvedOutputPath}");
        return ArtifactWriteStatus.Created;
    }
}
