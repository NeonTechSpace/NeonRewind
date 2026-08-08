using System.Security.Cryptography;

namespace NeonRewind.RuntimeExporter;

internal static class FileIdentityFactory
{
    public static FileIdentity Create(string path)
    {
        var file = new FileInfo(Path.GetFullPath(path));
        using var stream = file.OpenRead();
        var hash = SHA256.HashData(stream);

        return new FileIdentity(
            file.Name,
            file.Length,
            Convert.ToHexStringLower(hash));
    }
}
