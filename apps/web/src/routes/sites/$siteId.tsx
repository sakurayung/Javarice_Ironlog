import { createFileRoute } from "@tanstack/react-router";

import { SiteDetail } from "@/components/sites/site-detail";

export const Route = createFileRoute("/sites/$siteId")({
    component: SiteDetailPage,
});

function SiteDetailPage() {
    const { siteId } = Route.useParams();
    return <SiteDetail siteId={siteId} />;
}
