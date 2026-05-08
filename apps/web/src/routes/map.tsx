import "mapbox-gl/dist/mapbox-gl.css";

import { Button } from "@project-construction/ui/components/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@project-construction/ui/components/table";
import { createFileRoute } from "@tanstack/react-router";
import mapboxgl from "mapbox-gl";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { useAssignments } from "@/hooks/useAssignments";
import { useEquipment } from "@/hooks/useEquipment";
import { useSites } from "@/hooks/useSites";
import { Equipment, Site } from "@/types";

const searchSchema = z.object({
    highlightSite: z.string().optional(),
});

export const Route = createFileRoute("/map")({
    validateSearch: searchSchema,
    component: MapPage,
});

const DAVAO_CENTER: [number, number] = [125.6128, 7.0707];

type SiteDeployment = {
    site: Site;
    equipment: Equipment[];
};

class MapErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6">
                    <p className="text-sm text-destructive">
                        Map is currently unavailable.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

function MapPage() {
    return (
        <MapErrorBoundary>
            <MapContent />
        </MapErrorBoundary>
    );
}

function MapContent() {
    const { highlightSite } = Route.useSearch();
    const { data: sites } = useSites();
    const { data: equipment } = useEquipment();
    const { data: assignments } = useAssignments();
    const [mapError, setMapError] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const popupRef = useRef<mapboxgl.Popup | null>(null);

    const siteDeployments = useMemo<SiteDeployment[]>(() => {
        const equipmentById = new Map(equipment.map((item) => [item.id, item]));
        const activeAssignments = assignments.filter(
            (asn) => !asn.unassignedAt,
        );
        const grouped: Record<string, Equipment[]> = {};

        for (const assignment of activeAssignments) {
            const eq = equipmentById.get(assignment.equipmentId);
            if (!eq || eq.status !== "Deployed") {
                continue;
            }
            if (!grouped[assignment.siteId]) {
                grouped[assignment.siteId] = [];
            }
            grouped[assignment.siteId].push(eq);
        }

        return sites
            .filter((site) => site.isActive)
            .map((site) => ({
                site,
                equipment: grouped[site.id] ?? [],
            }))
            .filter((item) => item.equipment.length > 0);
    }, [assignments, equipment, sites]);

    useEffect(() => {
        if (mapRef.current || mapError) {
            return;
        }

        if (!mapContainerRef.current) {
            return;
        }

        const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
        if (!token) {
            setMapError("Mapbox token is missing.");
            return;
        }

        mapboxgl.accessToken = token;

        try {
            const map = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: "mapbox://styles/mapbox/streets-v12",
                center: DAVAO_CENTER,
                zoom: 12,
            });

            map.on("load", () => setMapReady(true));
            mapRef.current = map;
        } catch (error) {
            setMapError("Map is currently unavailable.");
        }

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [mapError]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) {
            return;
        }

        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        popupRef.current?.remove();

        siteDeployments.forEach(({ site, equipment: siteEquipment }) => {
            const element = document.createElement("div");
            element.textContent = String(siteEquipment.length);
            element.style.display = "flex";
            element.style.alignItems = "center";
            element.style.justifyContent = "center";
            element.style.width = "34px";
            element.style.height = "34px";
            element.style.borderRadius = "999px";
            element.style.fontSize = "12px";
            element.style.fontWeight = "700";
            element.style.backgroundColor = "#FFFFFF";
            element.style.color = "#1a73e8";
            element.style.border = "2px solid #1a73e8";
            element.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.2)";

            const marker = new mapboxgl.Marker({ element })
                .setLngLat([site.coordinates.lng, site.coordinates.lat])
                .addTo(map);

            element.addEventListener("click", () => {
                setSelectedSiteId(site.id);
                openPopup(map, site, siteEquipment, popupRef);
            });

            markersRef.current.push(marker);
        });
    }, [mapReady, refreshTick, siteDeployments]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady || !highlightSite) {
            return;
        }

        const match = siteDeployments.find(
            (item) => item.site.id === highlightSite,
        );
        if (!match) {
            return;
        }

        setSelectedSiteId(match.site.id);
        map.flyTo({
            center: [match.site.coordinates.lng, match.site.coordinates.lat],
            zoom: 13,
        });
        openPopup(map, match.site, match.equipment, popupRef);
    }, [highlightSite, mapReady, siteDeployments]);

    const selectedDeployment = siteDeployments.find(
        (item) => item.site.id === selectedSiteId,
    );

    if (mapError) {
        return (
            <div className="p-6">
                <p className="text-sm text-destructive">
                    Map is currently unavailable.
                </p>
                <div className="mt-4 border border-border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                        Active sites and deployed equipment summary
                    </p>
                    <MapFallbackTable
                        sites={sites}
                        assignments={assignments}
                        equipment={equipment}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="il-display text-xl">Equipment Map</h1>
                        <p className="text-sm text-muted-foreground">
                            Deployed equipment by site across Davao City.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="h-10"
                        onClick={() => setRefreshTick((prev) => prev + 1)}
                    >
                        Refresh
                    </Button>
                </div>
                <div
                    ref={mapContainerRef}
                    className="h-130 w-full overflow-hidden border border-border"
                />
            </div>

            <aside className="border border-border bg-card p-4">
                <h2 className="il-display text-lg">Site Detail</h2>
                {siteDeployments.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                        No deployed equipment yet. Assign equipment to a site to
                        see markers on the map.
                    </p>
                ) : selectedDeployment ? (
                    <div className="mt-3 flex flex-col gap-3 text-sm">
                        <div>
                            <p className="font-semibold text-foreground">
                                {selectedDeployment.site.name}
                            </p>
                            <p className="text-muted-foreground">
                                {selectedDeployment.site.location}
                            </p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Deployed equipment
                            </span>
                            <ul className="mt-2 flex flex-col gap-1">
                                {selectedDeployment.equipment.map((eq) => (
                                    <li key={eq.id} className="text-foreground">
                                        {eq.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="text-muted-foreground">
                            Total Units: {selectedDeployment.equipment.length}
                        </div>
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                        Select a marker to view site details.
                    </p>
                )}
            </aside>
        </div>
    );
}

function openPopup(
    map: mapboxgl.Map,
    site: Site,
    equipment: Equipment[],
    popupRef: React.MutableRefObject<mapboxgl.Popup | null>,
) {
    popupRef.current?.remove();
    const equipmentList = equipment.map((item) => item.name).join(", ");
    const html = `
        <div style="font-size:12px; font-weight:600; margin-bottom:4px;">
            ${site.name}
        </div>
        <div style="font-size:11px; color:#9A9890; margin-bottom:6px;">
            ${site.location}
        </div>
        <div style="font-size:11px; color:#9A9890;">
            ${equipmentList}
        </div>
        <div style="font-size:11px; margin-top:6px;">
            Total Units: ${equipment.length}
        </div>
    `;

    popupRef.current = new mapboxgl.Popup({ offset: 16 })
        .setLngLat([site.coordinates.lng, site.coordinates.lat])
        .setHTML(html)
        .addTo(map);
}

function MapFallbackTable({
    sites,
    assignments,
    equipment,
}: {
    sites: Site[];
    assignments: {
        siteId: string;
        equipmentId: string;
        unassignedAt?: string;
    }[];
    equipment: Equipment[];
}) {
    const equipmentById = useMemo(
        () => new Map(equipment.map((item) => [item.id, item])),
        [equipment],
    );

    const rows = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const asn of assignments) {
            if (asn.unassignedAt) {
                continue;
            }
            const eq = equipmentById.get(asn.equipmentId);
            if (!eq || eq.status !== "Deployed") {
                continue;
            }
            counts[asn.siteId] = (counts[asn.siteId] ?? 0) + 1;
        }

        return sites
            .filter((site) => site.isActive)
            .map((site) => ({
                id: site.id,
                name: site.name,
                location: site.location,
                count: counts[site.id] ?? 0,
            }));
    }, [assignments, equipmentById, sites]);

    return (
        <Table className="mt-4">
            <TableHeader>
                <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Deployed Units</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.id}>
                        <TableCell className="font-medium">
                            {row.name}
                        </TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell className="text-right">
                            {row.count}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
