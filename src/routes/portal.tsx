import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal-shell";
import { WorkspaceGate } from "@/components/workspace-gate";

export const Route = createFileRoute("/portal")({ component: PortalLayout });

function PortalLayout() {
  return (
    <WorkspaceGate expect="client">
      {(actor) => (
        <PortalShell actor={actor}>
          <Outlet />
        </PortalShell>
      )}
    </WorkspaceGate>
  );
}
