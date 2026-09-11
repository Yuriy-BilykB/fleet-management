using FleetManagement.Api.Contracts;

namespace FleetManagement.Api.Services;

public interface IDashboardService
{
    Task<DashboardResponse> GetSummaryAsync(Guid? companyId, CancellationToken ct);
    Task<IReadOnlyList<ServiceSpendPoint>> GetServiceSpendAsync(
        Guid? companyId, int? months, CancellationToken ct);
}
