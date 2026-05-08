import { Badge } from "@project-construction/ui/components/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@project-construction/ui/components/table";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { useAssignments } from "@/hooks/useAssignments";
import { useEquipment } from "@/hooks/useEquipment";
import { useSites } from "@/hooks/useSites";

export function SitesList() {
    const { data: sites } = useSites();
    const { data: assignments } = useAssignments();
    const { data: equipment } = useEquipment();

    const rows = useMemo(() => {
        const equipmentById = new Map(equipment.map((item) => [item.id, item]));
        const counts: Record<string, number> = {};

        assignments.forEach((assignment) => {
            if (assignment.unassignedAt) {
                return;
            }
            const eq = equipmentById.get(assignment.equipmentId);
            if (!eq || eq.status !== "Deployed") {
                return;
            }
            counts[assignment.siteId] = (counts[assignment.siteId] ?? 0) + 1;
        });

        return sites
            .filter((site) => site.isActive)
            .map((site) => ({
                id: site.id,
                name: site.name,
                location: site.location,
                count: counts[site.id] ?? 0,
            }));
    }, [assignments, equipment, sites]);

    return (
        <div className="p-6">
            <div className="mb-4">
                <h1 className="il-display text-xl">Sites</h1>
                <p className="text-sm text-muted-foreground">
                    Active construction sites with deployed equipment counts.
                </p>
            </div>
            <div className="border border-border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Site</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">
                                Equipment
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="font-medium">
                                    <Link
                                        to="/sites/$siteId"
                                        params={{ siteId: row.id }}
                                        className="text-foreground hover:text-primary"
                                    >
                                        {row.name}
                                    </Link>
                                </TableCell>
                                <TableCell>{row.location}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="secondary">
                                        {row.count} deployed
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
