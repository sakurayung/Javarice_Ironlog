import { useMockData } from "@/contexts/MockDataContext";
import { EquipmentLogEntry } from "@/types";

export function useEquipmentLog() {
    // TODO(backend): replace with Convex query
    const { equipmentLog, setEquipmentLog } = useMockData();

    const addEquipmentLog = (entry: EquipmentLogEntry) => {
        setEquipmentLog((prev) => [entry, ...prev]);
    };

    return {
        data: equipmentLog,
        isLoading: false,
        addEquipmentLog,
    };
}
