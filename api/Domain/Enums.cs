namespace FleetManagement.Api.Domain;

public enum TruckStatus
{
    Available,
    OnTrip,
    InService,
    Decommissioned
}

public enum DriverStatus
{
    Active,
    OnTrip,
    OnLeave,
    Inactive
}

public enum ShipmentStatus
{
    Draft,
    Scheduled,
    InTransit,
    Delivered,
    Cancelled
}

public enum TripStatus
{
    Planned,
    InProgress,
    Completed,
    Cancelled
}

public enum TruckServiceType
{
    Maintenance,
    Repair,
    Inspection,
    TireChange,
    Other
}

public enum DocumentType
{
    Other,
    Insurance,
    Registration,
    TechnicalInspection,
    DriverLicense,
    MedicalCertificate,
    Contract,
    Invoice,
    WaybillCmr
}

public enum DocumentOwnerType
{
    Truck,
    Driver,
    Shipment
}
