import React, { createContext, useContext, useState } from "react";
import {
    Equipment,
    Site,
    Assignment,
    AuditEntry,
    EquipmentLogEntry,
} from "@/types";
import { initialMockEquipment } from "@/lib/mock/equipment";
import { initialMockSites } from "@/lib/mock/sites";
import { initialMockAssignments } from "@/lib/mock/assignments";
import { initialMockAuditLog } from "@/lib/mock/audit-log";
import { initialMockEquipmentLog } from "@/lib/mock/equipment-log";

interface MockDataContextType {
    equipment: Equipment[];
    setEquipment: React.Dispatch<React.SetStateAction<Equipment[]>>;
    sites: Site[];
    setSites: React.Dispatch<React.SetStateAction<Site[]>>;
    assignments: Assignment[];
    setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
    auditLog: AuditEntry[];
    setAuditLog: React.Dispatch<React.SetStateAction<AuditEntry[]>>;
    equipmentLog: EquipmentLogEntry[];
    setEquipmentLog: React.Dispatch<React.SetStateAction<EquipmentLogEntry[]>>;
}

const MockDataContext = createContext<MockDataContextType | undefined>(
    undefined,
);

export function MockDataProvider({ children }: { children: React.ReactNode }) {
    const [equipment, setEquipment] =
        useState<Equipment[]>(initialMockEquipment);
    const [sites, setSites] = useState<Site[]>(initialMockSites);
    const [assignments, setAssignments] = useState<Assignment[]>(
        initialMockAssignments,
    );
    const [auditLog, setAuditLog] = useState<AuditEntry[]>(initialMockAuditLog);
    const [equipmentLog, setEquipmentLog] = useState<EquipmentLogEntry[]>(
        initialMockEquipmentLog,
    );

    return (
        <MockDataContext.Provider
            value={{
                equipment,
                setEquipment,
                sites,
                setSites,
                assignments,
                setAssignments,
                auditLog,
                setAuditLog,
                equipmentLog,
                setEquipmentLog,
            }}
        >
            {children}
        </MockDataContext.Provider>
    );
}

export function useMockData() {
    const context = useContext(MockDataContext);
    if (context === undefined) {
        throw new Error("useMockData must be used within a MockDataProvider");
    }
    return context;
}
