import { createFileRoute } from "@tanstack/react-router";

import { AuditLogPage } from "@/components/audit/audit-log-page";

export const Route = createFileRoute("/audit-log")({
    component: AuditLogPage,
});
