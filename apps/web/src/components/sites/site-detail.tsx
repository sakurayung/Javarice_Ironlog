import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@project-construction/ui/components/badge";
import { Button } from "@project-construction/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@project-construction/ui/components/dialog";
import { Input } from "@project-construction/ui/components/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@project-construction/ui/components/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@project-construction/ui/components/table";
import { useForm, Controller } from "react-hook-form";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PermissionGuard } from "@/components/permission-guard";
import { useAuth } from "@/hooks/useAuth";
import { useAssignments } from "@/hooks/useAssignments";
import { useEquipment } from "@/hooks/useEquipment";
import { useEquipmentLog } from "@/hooks/useEquipmentLog";
import { useSites } from "@/hooks/useSites";
import { Assignment, Equipment, EquipmentStatus } from "@/types";

const assignSchema = z.object({
    equipmentId: z.string().min(1, "Select equipment to assign"),
});

const unassignSchema = z.object({
    reason: z.string().min(2, "Reason is required"),
});

const statusConfig: Record<
    EquipmentStatus,
    { label: string; badgeClass: string }
> = {
    Available: {
        label: "Available",
        badgeClass: "il-badge-available",
    },
    Deployed: {
        label: "Deployed",
        badgeClass: "il-badge-active",
    },
    "Under Maintenance": {
        label: "Maintenance",
        badgeClass: "il-badge-maintenance",
    },
    Decommissioned: {
        label: "Decommissioned",
        badgeClass: "il-badge-offline",
    },
};

type AssignedItem = {
    assignment: Assignment;
    equipment: Equipment;
};

type AssignFormValues = z.infer<typeof assignSchema>;
type UnassignFormValues = z.infer<typeof unassignSchema>;

export function SiteDetail({ siteId }: { siteId: string }) {
    const { data: sites } = useSites();
    const { data: equipment, updateEquipment } = useEquipment();
    const {
        data: assignments,
        addAssignment,
        updateAssignment,
    } = useAssignments();
    const { addEquipmentLog } = useEquipmentLog();
    const { currentUser } = useAuth();

    const [assignOpen, setAssignOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [unassignOpen, setUnassignOpen] = useState(false);
    const [unassignTarget, setUnassignTarget] = useState<AssignedItem | null>(
        null,
    );

    const assignForm = useForm<AssignFormValues>({
        resolver: zodResolver(assignSchema),
        defaultValues: { equipmentId: "" },
    });

    const unassignForm = useForm<UnassignFormValues>({
        resolver: zodResolver(unassignSchema),
        defaultValues: { reason: "" },
    });

    const site = sites.find((item) => item.id === siteId);

    const equipmentById = useMemo(
        () => new Map(equipment.map((item) => [item.id, item])),
        [equipment],
    );

    const assignedItems = useMemo<AssignedItem[]>(() => {
        return assignments
            .filter(
                (assignment) =>
                    assignment.siteId === siteId && !assignment.unassignedAt,
            )
            .map((assignment) => {
                const eq = equipmentById.get(assignment.equipmentId);
                if (!eq) {
                    return null;
                }
                return { assignment, equipment: eq };
            })
            .filter((item): item is AssignedItem => item !== null);
    }, [assignments, equipmentById, siteId]);

    const availableEquipment = useMemo(() => {
        return equipment.filter((eq) => eq.status === "Available");
    }, [equipment]);

    const filteredAvailable = useMemo(() => {
        return availableEquipment.filter((eq) =>
            eq.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );
    }, [availableEquipment, searchTerm]);

    if (!site) {
        return (
            <div className="p-6">
                <p className="text-sm text-muted-foreground">Site not found.</p>
            </div>
        );
    }

    const handleAssign = (values: AssignFormValues) => {
        const eq = equipmentById.get(values.equipmentId);
        if (!eq) {
            toast.error("Select equipment to assign");
            return;
        }

        if (eq.status === "Deployed") {
            toast.error("Equipment is already deployed at another site");
            return;
        }

        if (eq.status === "Under Maintenance") {
            toast.warning(
                "Equipment is under maintenance and cannot be assigned",
            );
            return;
        }

        if (eq.status === "Decommissioned") {
            toast.error("Equipment is decommissioned and cannot be assigned");
            return;
        }

        const alreadyAssigned = assignments.some(
            (assignment) =>
                assignment.equipmentId === eq.id && !assignment.unassignedAt,
        );
        if (alreadyAssigned) {
            toast.error("Equipment is already deployed at another site");
            return;
        }

        updateEquipment(eq.id, {
            status: "Deployed",
            updatedAt: new Date().toISOString(),
        });

        addAssignment({
            id: `asn-${Date.now()}`,
            equipmentId: eq.id,
            siteId: site.id,
            assignedAt: new Date().toISOString(),
            assignedBy: currentUser?.name ?? "System",
        });

        addEquipmentLog({
            id: `log-${Date.now()}`,
            equipmentId: eq.id,
            action: "Assigned",
            timestamp: new Date().toISOString(),
            note: `Assigned to ${site.name} by ${currentUser?.name ?? "System"}`,
        });

        toast.success("Equipment assigned");
        setAssignOpen(false);
        assignForm.reset({ equipmentId: "" });
        setSearchTerm("");
    };

    const handleUnassign = (values: UnassignFormValues) => {
        if (!unassignTarget) {
            return;
        }

        updateEquipment(unassignTarget.equipment.id, {
            status: "Available",
            updatedAt: new Date().toISOString(),
        });

        updateAssignment(unassignTarget.assignment.id, {
            unassignedAt: new Date().toISOString(),
            unassignReason: values.reason,
        });

        addEquipmentLog({
            id: `log-${Date.now()}`,
            equipmentId: unassignTarget.equipment.id,
            action: "Unassigned",
            timestamp: new Date().toISOString(),
            note: values.reason,
        });

        toast.success("Equipment unassigned");
        setUnassignOpen(false);
        unassignForm.reset({ reason: "" });
        setUnassignTarget(null);
    };

    return (
        <div className="p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="il-display text-xl">{site.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {site.location}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Coordinates: {site.coordinates.lat},{" "}
                        {site.coordinates.lng}
                    </p>
                </div>
                <PermissionGuard action="assignEquipment" fallback={null}>
                    <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                        <DialogTrigger
                            render={
                                <Button className="h-12">
                                    Assign Equipment
                                </Button>
                            }
                        />
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Assign equipment</DialogTitle>
                                <DialogDescription>
                                    Select an available unit to deploy to this
                                    site.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={assignForm.handleSubmit(handleAssign)}
                                className="flex flex-col gap-4"
                            >
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-muted-foreground">
                                        Search available equipment
                                    </label>
                                    <Input
                                        value={searchTerm}
                                        onChange={(event) =>
                                            setSearchTerm(event.target.value)
                                        }
                                        className="h-12"
                                        placeholder="Search by name"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-muted-foreground">
                                        Equipment
                                    </label>
                                    <Controller
                                        control={assignForm.control}
                                        name="equipmentId"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger className="w-full h-12">
                                                    <SelectValue placeholder="Select equipment" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {filteredAvailable.length ===
                                                    0 ? (
                                                        <SelectItem
                                                            value=""
                                                            disabled
                                                        >
                                                            No available
                                                            equipment
                                                        </SelectItem>
                                                    ) : (
                                                        filteredAvailable.map(
                                                            (eq) => (
                                                                <SelectItem
                                                                    key={eq.id}
                                                                    value={
                                                                        eq.id
                                                                    }
                                                                >
                                                                    {eq.name}
                                                                </SelectItem>
                                                            ),
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {assignForm.formState.errors
                                        .equipmentId && (
                                        <span className="text-sm text-destructive">
                                            {
                                                assignForm.formState.errors
                                                    .equipmentId.message
                                            }
                                        </span>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="h-12">
                                        Confirm Assignment
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </PermissionGuard>
            </div>

            <div className="mt-6 border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold">
                        Assigned Equipment
                    </h2>
                </div>
                {assignedItems.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                        No equipment assigned to this site yet.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Equipment</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignedItems.map(
                                ({ assignment, equipment: eq }) => {
                                    const config = statusConfig[eq.status];
                                    return (
                                        <TableRow key={assignment.id}>
                                            <TableCell className="font-medium">
                                                {eq.name}
                                            </TableCell>
                                            <TableCell>{eq.type}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        config.badgeClass
                                                    }
                                                >
                                                    {config.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {eq.keyStatus}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <PermissionGuard action="assignEquipment">
                                                    <Button
                                                        variant="outline"
                                                        className="h-12"
                                                        onClick={() => {
                                                            setUnassignTarget({
                                                                assignment,
                                                                equipment: eq,
                                                            });
                                                            setUnassignOpen(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        Unassign
                                                    </Button>
                                                </PermissionGuard>
                                            </TableCell>
                                        </TableRow>
                                    );
                                },
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog
                open={unassignOpen}
                onOpenChange={(open) => {
                    setUnassignOpen(open);
                    if (!open) {
                        setUnassignTarget(null);
                        unassignForm.reset({ reason: "" });
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unassign equipment</DialogTitle>
                        <DialogDescription>
                            Provide a reason for unassigning{" "}
                            {unassignTarget?.equipment.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={unassignForm.handleSubmit(handleUnassign)}
                        className="flex flex-col gap-4"
                    >
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-muted-foreground">
                                Reason
                            </label>
                            <Input
                                {...unassignForm.register("reason")}
                                className="h-12"
                                placeholder="Required reason"
                            />
                            {unassignForm.formState.errors.reason && (
                                <span className="text-sm text-destructive">
                                    {
                                        unassignForm.formState.errors.reason
                                            .message
                                    }
                                </span>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="h-12">
                                Confirm Unassign
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
