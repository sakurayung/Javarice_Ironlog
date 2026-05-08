import { createFileRoute } from "@tanstack/react-router";

import { SitesList } from "@/components/sites/sites-list";

export const Route = createFileRoute("/sites/")({
    component: SitesList,
});
