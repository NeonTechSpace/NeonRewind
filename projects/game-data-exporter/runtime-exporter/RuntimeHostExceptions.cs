namespace NeonRewind.RuntimeExporter;

internal sealed class RuntimeHostConflictException(string message) : IOException(message);

internal sealed class RuntimeHostApprovalRequiredException(string message) : InvalidOperationException(message);
