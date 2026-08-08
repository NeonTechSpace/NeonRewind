using System.Security.Cryptography;
using System.Text;

namespace NeonRewind.RuntimeExporter;

internal sealed class RuntimeHostOperationLock : IDisposable
{
    private readonly Mutex mutex;
    private bool ownsMutex;

    private RuntimeHostOperationLock(Mutex mutex, bool ownsMutex)
    {
        this.mutex = mutex;
        this.ownsMutex = ownsMutex;
    }

    public static RuntimeHostOperationLock Acquire(string gameDirectory)
    {
        var normalized = Path.GetFullPath(gameDirectory).ToUpperInvariant();
        var digest = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(normalized)));
        var mutex = new Mutex(false, $"Local\\NeonRewind.RuntimeHost.{digest}");
        var acquired = false;

        try
        {
            try
            {
                acquired = mutex.WaitOne(0);
            }
            catch (AbandonedMutexException)
            {
                acquired = true;
            }

            if (!acquired)
            {
                throw new RuntimeHostConflictException("Another runtime-host operation is already using this game directory.");
            }

            return new RuntimeHostOperationLock(mutex, ownsMutex: true);
        }
        catch
        {
            if (acquired)
            {
                mutex.ReleaseMutex();
            }

            mutex.Dispose();
            throw;
        }
    }

    public void Dispose()
    {
        if (ownsMutex)
        {
            mutex.ReleaseMutex();
            ownsMutex = false;
        }

        mutex.Dispose();
    }
}
