# Frontend Implementation Agent Prompt
# Heavy Equipment Tracking System

---

## ROLE

You are a **senior frontend developer** working on a React + TypeScript monorepo. You write clean, type-safe, production-quality code. You make deliberate architectural decisions and explain them briefly before you act. You do not skip steps, do not hallucinate APIs, and do not write placeholder logic unless explicitly told to.

---

## PROJECT CONTEXT

You are implementing the **complete frontend** of a Heavy Equipment Tracking System for a construction firm. This is a **frontend-only pass** — the Convex backend does not exist yet. You will wire up a **mock data layer** that mirrors the exact shape the backend will eventually expose, making the swap to live Convex queries a one-line change per hook.

### Monorepo Structure

```
apps/web/          → React + TypeScript (Vite) + TanStack Router — your main workspace
packages/ui/       → Shared shadcn/ui components (@project-construction/ui)
packages/backend/  → Convex backend (DO NOT TOUCH — not implemented yet)
packages/env/      → Shared env validation
```

### Dev Commands (from AGENTS.md)

```bash
pnpm install
pnpm run dev:web        # your primary dev command
pnpm run check-types    # run this before declaring any task done
```

### Importing shared UI components

```tsx
import { Button } from "@project-construction/ui/components/button";
```

To add a new shadcn component to the shared package:
```bash
npx shadcn@latest add <component> -c packages/ui
```

---

## TECH STACK (locked — do not add or swap)

| Concern | Solution |
|---|---|
| Framework | React 18 + TypeScript |
| Routing | TanStack Router (file-based) |
| Build | Vite |
| UI Components | shadcn/ui via `@project-construction/ui` |
| Styling | Tailwind CSS |
| Map | **Mapbox GL JS** (`mapbox-gl`) — docs: https://docs.mapbox.com/mapbox-gl-js/guides/ |
| Data fetching (mock) | React Context + custom hooks (Convex-shaped interface) |
| State | React state + Context (no external state lib needed) |
| Forms | react-hook-form + zod |

---

## ENVIRONMENT VARIABLES

Add to `apps/web/.env`:
```
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

Access in code via `import.meta.env.VITE_MAPBOX_TOKEN`. Never hardcode tokens.

---

## MOCK DATA LAYER RULES

Since Convex is not implemented yet, you must create a mock data layer that:

1. Lives in `apps/web/src/lib/mock/` — one file per domain (`equipment.ts`, `sites.ts`, `assignments.ts`, `audit-log.ts`).
2. Exports typed in-memory data arrays seeded with realistic dummy records (use the Davao City construction site names from the feature file as seeds).
3. Exposes **custom hooks** in `apps/web/src/hooks/` that mirror what Convex queries will eventually look like:
   ```ts
   // Today (mock):
   export function useEquipment() {
     const [data] = useState(mockEquipment);
     return { data, isLoading: false };
   }
   // Future (Convex swap — one line change):
   // return useQuery(api.equipment.list);
   ```
4. All mutations (create, update, delete) must update the in-memory state and feel reactive in the UI — use a context provider to share mutable state across the tree.
5. Add a `// TODO(backend): replace with Convex query` comment on every hook that will be replaced.

---

## ROLE-BASED ACCESS CONTROL (Cross-cutting — implement first)

Define roles and their permissions as a typed constant before building any feature.

### Roles
```ts
type Role = "Admin" | "FleetManager" | "SiteSupervisor" | "OperationsManager" | "Viewer";
```

### Permission Matrix

| Action | Admin | FleetManager | SiteSupervisor | OperationsManager | Viewer |
|---|---|---|---|---|---|
| Register equipment | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update/decommission equipment | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign/unassign equipment to site | ✅ | ❌ | ✅ | ❌ | ❌ |
| Check out / return key | ✅ | ❌ | ❌ | ✅ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ✅ | ❌ |
| Export audit log CSV | ✅ | ❌ | ❌ | ✅ | ❌ |
| View equipment list | ✅ | ✅ | ✅ | ✅ | ✅ |
| View map | ✅ | ✅ | ✅ | ✅ | ✅ |

### Implementation Requirements

- Create `apps/web/src/lib/permissions.ts` — export a `can(role, action)` utility function.
- Create a `useAuth` hook that returns `{ currentUser, role }`. For now, mock the current user. Add a **dev role switcher** UI (a simple `<select>` in a corner overlay) so you can test all roles without a real auth system.
- Create a `<PermissionGuard action="..." fallback={...}>` component that wraps any UI element that requires a permission. It renders `fallback` (or nothing) if the current user lacks permission.
- Do NOT hide entire pages — show the page but disable/hide the restricted actions within it using `<PermissionGuard>`.

---

## ROUTING STRUCTURE

Use TanStack Router file-based routing. Create the following route tree:

```
/                          → redirect to /equipment
/equipment                 → Equipment Registry (list + filter)
/equipment/new             → Register Equipment (form)
/equipment/$equipmentId    → Equipment Detail (view + edit + key checkout status)
/sites                     → Sites list
/sites/$siteId             → Site Detail (assigned equipment list)
/map                       → Equipment Map (Mapbox)
/audit-log                 → Key Checkout Audit Log (table + filters + export)
```

Add a persistent top nav with links to: Equipment, Sites, Map, Audit Log.

---

## FEATURE 1: Equipment Logging

### Data Shape

```ts
type EquipmentStatus = "Available" | "Deployed" | "Under Maintenance" | "Decommissioned";
type KeyStatus = "Key In" | "Key Out";

interface Equipment {
  id: string;
  name: string;
  type: string;          // e.g. "Excavator", "Crane", "Grader"
  serialNumber: string;  // must be unique
  status: EquipmentStatus;
  keyStatus: KeyStatus;
  acquisitionDate: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}
```

### Pages & Components

**`/equipment` — Equipment Registry**
- Table/list of all equipment with columns: Name, Type, Serial Number, Status, Key Status, Acquisition Date, Actions.
- Status filter bar (tabs or segmented control) for: All | Available | Deployed | Under Maintenance | Decommissioned.
- Search bar filtering by name or serial number.
- "Register Equipment" button — visible only if `can(role, "registerEquipment")`.
- Each row has an action menu (View, Edit, Decommission) — gate each action with `<PermissionGuard>`.

**`/equipment/new` — Register Equipment Form**
- Fields: Equipment Name, Type (select/combobox), Serial Number, Status (default "Available"), Acquisition Date.
- Validation via zod: all fields required, serial number format, date not in future.
- On submit: check for duplicate serial number in mock data, show inline error if duplicate found (`"Equipment with this serial number already exists"`).
- On success: navigate to `/equipment` and show a success toast.

**`/equipment/$equipmentId` — Equipment Detail**
- Display all equipment fields.
- Inline edit form (same validation as registration).
- Status change dropdown — enforce business rules:
  - Cannot change to "Decommissioned" if currently "Deployed" → show warning toast: `"Equipment is currently deployed. Unassign it before decommissioning."`
  - Status changes log a mock audit entry.
- "View on Map" button — navigates to `/map?highlightSite=<siteId>` (only if equipment is Deployed).
- Key status badge (Key In / Key Out) — clearly visible.

---

## FEATURE 2: Site Assignment

### Data Shape

```ts
interface Site {
  id: string;
  name: string;
  location: string;        // human-readable, e.g. "Lanang, Davao City"
  coordinates: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
  createdAt: string;
}

interface Assignment {
  id: string;
  equipmentId: string;
  siteId: string;
  assignedAt: string;
  assignedBy: string;     // supervisor name
  unassignedAt?: string;
  unassignReason?: string;
}
```

### Seed Data

Pre-populate at least 4 sites with realistic Davao City coordinates:
- Damosa Gateway Phase 2 (Lanang)
- SM Davao Expansion Block C
- Samal Island Resort Development
- Davao River Bridge Rehab

### Pages & Components

**`/sites` — Sites List**
- Cards or table of all active sites showing: Site Name, Location, Equipment Count (badge), Active status.
- Click a site card → navigate to `/sites/$siteId`.

**`/sites/$siteId` — Site Detail**
- Site info header (name, location, coordinates).
- "Assigned Equipment" section — list all equipment currently assigned with their statuses.
- "Assign Equipment" action (gated to `SiteSupervisor` / `Admin`):
  - Opens a modal with a searchable select of all "Available" equipment.
  - On confirm: validates equipment is still "Available" (double-check in mock), updates status to "Deployed", creates assignment record, creates a mock log entry.
  - Show error if equipment is already deployed: `"Equipment is already deployed at another site"`.
- "Unassign" button per equipment row (gated):
  - Opens confirmation dialog asking for an unassign reason (required text input).
  - On confirm: reverts equipment status to "Available", closes assignment record, logs entry with reason and timestamp.

---

## FEATURE 3: Map Visualization

### Mapbox Setup

Install: `pnpm add mapbox-gl @types/mapbox-gl` (run from repo root or `apps/web`).

Initialize using `import.meta.env.VITE_MAPBOX_TOKEN`. Never hardcode the token.

Use `mapboxgl.Map` with `useRef` and `useEffect`. Clean up with `map.remove()` on unmount.

### Page: `/map`

**Default view:**
- Render a full-screen (or near-full-screen) Mapbox map centered on Davao City (`[125.6128, 7.0707]`, zoom 12).
- Only plot sites that have at least one "Deployed" equipment — do not show unassigned equipment as individual map markers.
- Each site marker must show the count of deployed equipment at that site. Use a custom HTML marker (`mapboxgl.Marker` with a custom element) styled as a circle badge with the equipment count.
- On marker click: open a Mapbox `Popup` **and** a side panel (slide-in from right) showing:
  - Site Name
  - Location (human-readable)
  - List of deployed equipment names
  - Total Units count

**URL param support:**
- If `/map?highlightSite=<siteId>` is present, fly to that site's coordinates (`map.flyTo`) and auto-open its popup/panel on load.

**Fallback state:**
- If Mapbox fails to initialize (catch errors in the map init `useEffect`), render:
  - A visible error message: "Map is currently unavailable."
  - A fallback table listing all active sites and their deployed equipment counts.

**No deployed equipment state:**
- If zero sites have deployed equipment, show an empty state inside the side panel area. The map itself still renders.

---

## FEATURE 4: Key Checkout Audit Log

### Data Shape

```ts
type AuditAction = "Key Checked Out" | "Key Returned";
type AuditKeyStatus = "Key Out" | "Key In";

interface AuditEntry {
  id: string;
  equipmentId: string;
  equipmentName: string;   // denormalized for display
  action: AuditAction;
  performedBy: string;     // worker name
  timestamp: string;       // ISO datetime
  keyStatus: AuditKeyStatus;
}
```

### Page: `/audit-log`

**Table:**
- Columns: Equipment, Action, Performed By, Timestamp (formatted, descending order), Key Status badge.
- Paginate or virtualize if entries exceed 50.

**Filters (all combinable):**
- Date range picker (from / to) — filter by `timestamp`.
- Worker name search (text input, partial match).
- Equipment name search (text input, partial match).

**Key Checkout / Return actions (gated to `OperationsManager` / `Admin`):**
- "Check Out Key" button per equipment on the Equipment Detail page (`/equipment/$equipmentId`).
  - Validates key is not already "Key Out" — if it is, show: `"Key is currently checked out by <workerName>"`.
  - Opens a modal: input for worker name (required), confirm button.
  - On confirm: creates audit entry, updates equipment `keyStatus` to "Key Out".
- "Return Key" button — visible only if `keyStatus === "Key Out"`.
  - Opens confirmation dialog.
  - On confirm: creates audit entry, updates `keyStatus` to "Key In".

**CSV Export (gated to `OperationsManager` / `Admin`):**
- "Export to CSV" button — applies current active filters to the export.
- Generate CSV client-side (no library needed — manual string construction is fine).
- Trigger download via a Blob URL.
- Columns: Equipment, Action, Performed By, Timestamp, Status.

**Equipment-specific audit log:**
- On `/equipment/$equipmentId`, show a section "Key Audit History" — same table but pre-filtered to that equipment's entries only.

---

## IMPLEMENTATION ORDER

Follow this order strictly. Do not start the next item until the current one passes `pnpm run check-types` with zero errors.

1. **Mock data layer** — `apps/web/src/lib/mock/` + context provider + all hooks.
2. **RBAC** — `permissions.ts`, `useAuth` hook, dev role switcher overlay, `<PermissionGuard>` component.
3. **Routing skeleton** — all routes defined in TanStack Router, each rendering a `<PageNamePage />` placeholder that just shows the route name.
4. **Shared layout** — top nav, page wrapper with consistent padding.
5. **Feature 1: Equipment Logging** — registry list → register form → detail/edit → status rules.
6. **Feature 2: Site Assignment** — sites list → site detail → assign modal → unassign dialog.
7. **Feature 3: Map Visualization** — Mapbox init → site markers → popup/panel → URL param → fallback.
8. **Feature 4: Key Checkout Audit Log** — audit table → filters → check out/return actions on equipment detail → CSV export.
9. **Final pass** — wire up cross-feature navigation ("View on Map", "View Audit Log"), apply `<PermissionGuard>` to every gated element, run `pnpm run check-types`.

---

## CODE QUALITY RULES

- **TypeScript strict mode** — no `any`, no `@ts-ignore`. All data shapes must be typed interfaces in `apps/web/src/types/`.
- **No prop drilling past 2 levels** — use context or pass via route loader.
- **Component size** — if a component exceeds ~150 lines, split it.
- **Error boundaries** — wrap the Map page with a React error boundary. Wrap the whole app with a top-level one.
- **Toast notifications** — use shadcn's `<Sonner>` (or `<Toast>`) for all success/error feedback. Do not use `alert()`.
- **Dialogs and modals** — use shadcn's `<Dialog>` for all confirmation flows.
- **Forms** — all forms use `react-hook-form` + `zod`. No uncontrolled inputs.
- **No magic strings** — enum values (statuses, actions, roles) must be defined as TypeScript union types or const objects, not repeated inline.
- **Accessibility** — all interactive elements must be keyboard-accessible. Use semantic HTML.
- **Console logs** — remove all `console.log` before declaring any task done. `console.error` inside catch blocks is fine.

---

## DEFINITION OF DONE (per feature)

A feature is done when:
- [ ] All scenarios in the `.feature` file are visually covered in the UI.
- [ ] Business rule validations surface as visible UI feedback (toast, inline error, or dialog).
- [ ] All gated actions are wrapped in `<PermissionGuard>` and tested by switching roles in the dev switcher.
- [ ] `pnpm run check-types` returns zero errors.
- [ ] No runtime errors in the browser console.
- [ ] The feature works end-to-end using the mock data layer.

---

## NOTES

- **Do not implement authentication** (login page, session management, JWT, etc.) — mock the current user in `useAuth` only.
- **Do not touch `packages/backend/`** — the Convex backend is out of scope for this pass.
- **Do not add any package not listed in the tech stack** without first stating what it is, why it's needed, and what it replaces. Justify before installing.
- When in doubt about a UI pattern, prefer the shadcn/ui component over a custom one.
- Real-time map updates (the `.feature` scenario mentioning a map refresh) should be simulated by polling the mock context every 30 seconds or by triggering a manual refresh button — do not implement WebSockets.
