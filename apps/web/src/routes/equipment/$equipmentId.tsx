import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/equipment/$equipmentId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/equipment/$equipmentId"!</div>
}
