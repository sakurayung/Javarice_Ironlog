import { createFileRoute, Link } from "@tanstack/react-router";
import { useEquipment } from "@/hooks/useEquipment";
import { PermissionGuard } from "@/components/permission-guard";
import { useState, useMemo } from "react";
import { EquipmentStatus } from "@/types";
import { Badge } from "@project-construction/ui/components/badge";
import { Button } from "@project-construction/ui/components/button";
import { Input } from "@project-construction/ui/components/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@project-construction/ui/components/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@project-construction/ui/components/dropdown-menu";
import { MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/equipment/")({
    component: EquipmentPage,
});

const statusFilters: ("All" | EquipmentStatus)[] = [
    "All",
    "Available",
    "Deployed",
    "Under Maintenance",
    "Decommissioned",
];

const statusConfig: Record<
    EquipmentStatus,
    { label: string; badgeClass: string; dotClass: string }
> = {
    Available: {
        label: "Available",
        badgeClass: "il-badge-available",
        dotClass: "il-status-dot-available",
    },
    Deployed: {
        label: "Deployed",
        badgeClass: "il-badge-active",
        dotClass: "il-status-dot-active",
    },
    "Under Maintenance": {
        label: "Maintenance",
        badgeClass: "il-badge-maintenance",
        dotClass: "il-status-dot-maintenance",
    },
    Decommissioned: {
        label: "Offline",
        badgeClass: "il-badge-offline",
        dotClass: "il-status-dot-offline",
    },
};

function EquipmentPage() {
    const { data: equipmentList, updateEquipment } = useEquipment();
    const [filterStatus, setFilterStatus] = useState<"All" | EquipmentStatus>(
        "All",
    );
    const [searchQuery, setSearchQuery] = useState("");

    const filteredEquipment = useMemo(() => {
        return equipmentList.filter((eq) => {
            const matchesStatus =
                filterStatus === "All" || eq.status === filterStatus;
            const matchesSearch =
                eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                eq.serialNumber
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [equipmentList, filterStatus, searchQuery]);

    const handleDecommission = (id: string, currentStatus: EquipmentStatus) => {
        if (currentStatus === "Deployed") {
            toast.warning(
                "Equipment is currently deployed. Unassign it before decommissioning.",
            );
            return;
        }
        updateEquipment(id, {
            status: "Decommissioned",
            updatedAt: new Date().toISOString(),
        });
        toast.success("Equipment decommissioned.");
    };

    return (
        <div className="flex flex-col gap-6 p-4 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="il-display text-2xl text-foreground">
                        Equipment Registry
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage and track heavy equipment across all sites.
                    </p>
                </div>
                <PermissionGuard action="registerEquipment">
                    <Link to="/equipment/new">
                        <Button className="il-touch">Register Equipment</Button>
                    </Link>
                </PermissionGuard>
            </div>

            <div className="flex flex-col gap-4 border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                        {statusFilters.map((status) => (
                            <Button
                                key={status}
                                variant={
                                    filterStatus === status
                                        ? "secondary"
                                        : "outline"
                                }
                                onClick={() => setFilterStatus(status)}
                                className="il-touch h-12 px-4 text-sm"
                            >
                                {status}
                            </Button>
                        ))}
                    </div>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or serial..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="il-touch pl-9"
                        />
                    </div>
                </div>
            </div>

            <div className="border border-border bg-card overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name & ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Key Status</TableHead>
                            <TableHead>Acquisition Date</TableHead>
                            <TableHead className="w-16"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEquipment.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="h-24 text-center"
                                >
                                    No equipment found matching your filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEquipment.map((eq) => {
                                const status = statusConfig[eq.status];
                                return (
                                    <TableRow key={eq.id}>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-semibold">
                                                    {eq.name}
                                                </span>
                                                <span className="il-eq-id text-xs">
                                                    {eq.serialNumber}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{eq.type}</TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${status.badgeClass}`}
                                            >
                                                <span
                                                    className={`il-status-dot ${status.dotClass}`}
                                                />
                                                {status.label}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    eq.keyStatus === "Key Out"
                                                        ? "destructive"
                                                        : "secondary"
                                                }
                                                className="rounded-sm"
                                            >
                                                {eq.keyStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="il-timestamp">
                                            {eq.acquisitionDate}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <span className="sr-only">
                                                            Open menu
                                                        </span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <PermissionGuard action="viewEquipment">
                                                        <Link
                                                            to="/equipment/$equipmentId"
                                                            params={{
                                                                equipmentId:
                                                                    eq.id,
                                                            }}
                                                        >
                                                            <DropdownMenuItem>
                                                                View Details
                                                            </DropdownMenuItem>
                                                        </Link>
                                                    </PermissionGuard>
                                                    <PermissionGuard action="updateEquipment">
                                                        <Link
                                                            to="/equipment/$equipmentId"
                                                            params={{
                                                                equipmentId:
                                                                    eq.id,
                                                            }}
                                                        >
                                                            <DropdownMenuItem>
                                                                Edit Details
                                                            </DropdownMenuItem>
                                                        </Link>
                                                    </PermissionGuard>
                                                    <PermissionGuard action="updateEquipment">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDecommission(
                                                                    eq.id,
                                                                    eq.status,
                                                                )
                                                            }
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            Mark Decommissioned
                                                        </DropdownMenuItem>
                                                    </PermissionGuard>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
