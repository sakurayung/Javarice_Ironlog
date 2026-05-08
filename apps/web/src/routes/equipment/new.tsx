import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/equipment/new')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/equipment/new"!</div>
}
