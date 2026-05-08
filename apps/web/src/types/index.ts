export type EquipmentStatus =
    | "Available"
    | "Deployed"
    | "Under Maintenance"
    | "Decommissioned";
export type KeyStatus = "Key In" | "Key Out";

export interface Equipment {
    id: string;
    name: string;
    type: string; // e.g. "Excavator", "Crane", "Grader"
    serialNumber: string; // must be unique
    status: EquipmentStatus;
    keyStatus: KeyStatus;
    acquisitionDate: string; // ISO date string
    createdAt: string;
    updatedAt: string;
}

export interface Site {
    id: string;
    name: string;
    location: string; // human-readable, e.g. "Lanang, Davao City"
    coordinates: {
        lat: number;
        lng: number;
    };
    isActive: boolean;
    createdAt: string;
}

export interface Assignment {
    id: string;
    equipmentId: string;
    siteId: string;
    assignedAt: string;
    assignedBy: string; // supervisor name
    unassignedAt?: string;
    unassignReason?: string;
}

export type AuditAction = "Key Checked Out" | "Key Returned";
export type AuditKeyStatus = "Key Out" | "Key In";

export interface AuditEntry {
    id: string;
    equipmentId: string;
    equipmentName: string; // denormalized for display
    action: AuditAction;
    performedBy: string; // worker name
    timestamp: string; // ISO datetime
    keyStatus: AuditKeyStatus;
}

export type EquipmentLogAction =
    | "Registered"
    | "Status Updated"
    | "Decommissioned"
    | "Assigned"
    | "Unassigned";

export interface EquipmentLogEntry {
    id: string;
    equipmentId: string;
    action: EquipmentLogAction;
    timestamp: string; // ISO datetime
    note?: string;
}
