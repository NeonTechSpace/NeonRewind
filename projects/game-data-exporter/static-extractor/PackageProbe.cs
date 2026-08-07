using CUE4Parse.FileProvider;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class PackageProbe
{
    private const int InvalidArgumentsExitCode = 2;
    private const int NoContainersExitCode = 3;
    private const int EncryptedContainersExitCode = 4;
    private const int ProviderFailureExitCode = 5;

    public static int Run(string packageDirectory)
    {
        if (!Directory.Exists(packageDirectory))
        {
            Console.Error.WriteLine($"Package directory does not exist: {packageDirectory}");
            return InvalidArgumentsExitCode;
        }

        var resolvedPackageDirectory = Path.GetFullPath(packageDirectory);
        var versions = new VersionContainer(EGame.GAME_UE5_4);

        try
        {
            using var provider = new DefaultFileProvider(
                resolvedPackageDirectory,
                SearchOption.TopDirectoryOnly,
                versions,
                StringComparer.OrdinalIgnoreCase);

            provider.Initialize();
            provider.Mount();
            provider.PostMount();

            var mountedContainerCount = provider.MountedVfs.Count;
            var unloadedContainerCount = provider.UnloadedVfs.Count;
            var registeredContainerCount = mountedContainerCount + unloadedContainerCount;
            var requiredKeyCount = provider.RequiredKeys.Count;
            var unrealPackageCount = provider.Files.Values.Count(file => file.IsUePackage);

            Console.WriteLine("Initialization: succeeded");
            Console.WriteLine($"Package directory: {resolvedPackageDirectory}");
            Console.WriteLine("Engine profile: Unreal Engine 5.4 (configured, not detected)");
            Console.WriteLine($"Registered containers: {registeredContainerCount}");
            Console.WriteLine($"Mounted containers: {mountedContainerCount}");
            Console.WriteLine($"Unloaded containers: {unloadedContainerCount}");
            Console.WriteLine($"Required encryption keys: {requiredKeyCount}");
            Console.WriteLine($"Discovered files: {provider.Files.Count}");
            Console.WriteLine($"Unreal packages: {unrealPackageCount}");

            if (registeredContainerCount == 0)
            {
                Console.Error.WriteLine("No supported .pak or .utoc containers were found in the package directory.");
                return NoContainersExitCode;
            }

            if (unloadedContainerCount > 0)
            {
                Console.Error.WriteLine("One or more containers could not be mounted. Encryption keys or format-specific support may be required.");
                return EncryptedContainersExitCode;
            }

            return 0;
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine($"CUE4Parse initialization failed ({exception.GetType().Name}): {exception.Message}");
            return ProviderFailureExitCode;
        }
    }
}
