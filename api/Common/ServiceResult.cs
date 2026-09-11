namespace FleetManagement.Api.Common;

/// <summary>
/// Outcome of a service call, expressed without any HTTP vocabulary — the
/// controller is what maps these onto status codes.
/// </summary>
public enum ServiceStatus
{
    Success,
    NotFound,
    Invalid,
    Conflict
}

public class ServiceResult
{
    public ServiceStatus Status { get; }
    public string? Error { get; }
    public bool IsSuccess => Status == ServiceStatus.Success;

    protected ServiceResult(ServiceStatus status, string? error)
    {
        Status = status;
        Error = error;
    }

    public static ServiceResult Success() => new(ServiceStatus.Success, null);
    public static ServiceResult NotFound(string entity, Guid id) =>
        new(ServiceStatus.NotFound, $"{entity} '{id}' was not found.");
    public static ServiceResult Invalid(string message) => new(ServiceStatus.Invalid, message);
    public static ServiceResult Conflict(string message) => new(ServiceStatus.Conflict, message);
}

public class ServiceResult<T> : ServiceResult
{
    public T? Value { get; }

    private ServiceResult(ServiceStatus status, T? value, string? error) : base(status, error) =>
        Value = value;

    public static ServiceResult<T> Success(T value) => new(ServiceStatus.Success, value, null);

    public static new ServiceResult<T> NotFound(string entity, Guid id) =>
        new(ServiceStatus.NotFound, default, $"{entity} '{id}' was not found.");

    public static new ServiceResult<T> Invalid(string message) =>
        new(ServiceStatus.Invalid, default, message);

    public static new ServiceResult<T> Conflict(string message) =>
        new(ServiceStatus.Conflict, default, message);

    /// <summary>Carries a non-success outcome across to a different value type.</summary>
    public static ServiceResult<T> From(ServiceResult other) =>
        new(other.Status, default, other.Error);
}
