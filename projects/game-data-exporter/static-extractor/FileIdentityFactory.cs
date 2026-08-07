using System.Security.Cryptography;

namespace NeonRewind.StaticExtractor;

internal static class FileIdentityFactory
{
    public static FileIdentity Create(string path)
    {
        var file = new FileInfo(Path.GetFullPath(path));
        using var stream = file.OpenRead();
        var hash = SHA256.HashData(stream);

        return new FileIdentity(
            FileName: file.Name,
            SizeBytes: file.Length,
            Sha256: Convert.ToHexStringLower(hash));
    }

    public static string ComputeSha256(string path)
    {
        using var stream = File.OpenRead(Path.GetFullPath(path));
        return Convert.ToHexStringLower(SHA256.HashData(stream));
    }
}
