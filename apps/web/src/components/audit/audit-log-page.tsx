import { zodResolver } from "@hookform/resolvers/zod";
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
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PermissionGuard } from "@/components/permission-guard";
import { useAuditLog } from "@/hooks/useAuditLog";

const filterSchema = z.object({
    worker: z.string().optional(),
    equipment: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

function toTimestamp(value?: string) {
    if (!value) {
        return undefined;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? undefined : parsed;
}

function escapeCsv(value: string) {
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
        return `"${value.replace(/\"/g, '""')}"`;
    }
    return value;
}

export function AuditLogPage() {
    const { data: auditLog } = useAuditLog();

    const form = useForm<FilterValues>({
        resolver: zodResolver(filterSchema),
        defaultValues: {
            worker: "",
            equipment: "",
            from: "",
            to: "",
        },
    });

    const filters = form.watch();

    const filtered = useMemo(() => {
        const worker = filters.worker?.toLowerCase() ?? "";
        const equipment = filters.equipment?.toLowerCase() ?? "";
        const from = toTimestamp(filters.from || undefined);
        const to = toTimestamp(filters.to || undefined);

        return [...auditLog]
            .filter((entry) => {
                if (
                    worker &&
                    !entry.performedBy.toLowerCase().includes(worker)
                ) {
                    return false;
                }
                if (
                    equipment &&
                    !entry.equipmentName.toLowerCase().includes(equipment)
                ) {
                    return false;
                }
                const timestamp = new Date(entry.timestamp).getTime();
                if (from && timestamp < from) {
                    return false;
                }
                if (to && timestamp > to) {
                    return false;
                }
                return true;
            })
            .sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime(),
            );
    }, [auditLog, filters]);

    const handleExport = () => {
        const rows = [
            ["Equipment", "Action", "Performed By", "Timestamp", "Status"],
            ...filtered.map((entry) => [
                entry.equipmentName,
                entry.action,
                entry.performedBy,
                entry.timestamp,
                entry.keyStatus,
            ]),
        ];
        const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "audit-log.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="il-display text-xl">
                        Key Checkout Audit Log
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Review key checkout history and export filtered reports.
                    </p>
                </div>
                <PermissionGuard action="exportAuditLog" fallback={null}>
                    <Button className="h-12" onClick={handleExport}>
                        Export to CSV
                    </Button>
                </PermissionGuard>
            </div>

            <form className="mt-4 grid gap-3 rounded-none border border-border bg-card p-4 md:grid-cols-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-muted-foreground">
                        Worker name
                    </label>
                    <Input
                        {...form.register("worker")}
                        className="h-12"
                        placeholder="Search by worker"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-muted-foreground">
                        Equipment name
                    </label>
                    <Input
                        {...form.register("equipment")}
                        className="h-12"
                        placeholder="Search by equipment"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-muted-foreground">
                        From
                    </label>
                    <Input
                        {...form.register("from")}
                        className="h-12"
                        type="date"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-muted-foreground">To</label>
                    <Input
                        {...form.register("to")}
                        className="h-12"
                        type="date"
                    />
                </div>
            </form>

            <div className="mt-4 border border-border bg-card">
                <PermissionGuard
                    action="viewAuditLog"
                    fallback={
                        <div className="p-4 text-sm text-muted-foreground">
                            You do not have permission to view the audit log.
                        </div>
                    }
                >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Equipment</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Performed By</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium">
                                        {entry.equipmentName}
                                    </TableCell>
                                    <TableCell>{entry.action}</TableCell>
                                    <TableCell>{entry.performedBy}</TableCell>
                                    <TableCell>
                                        {new Date(
                                            entry.timestamp,
                                        ).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                entry.keyStatus === "Key Out"
                                                    ? "il-badge-maintenance"
                                                    : "il-badge-available"
                                            }
                                        >
                                            {entry.keyStatus}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </PermissionGuard>
            </div>
        </div>
    );
}
