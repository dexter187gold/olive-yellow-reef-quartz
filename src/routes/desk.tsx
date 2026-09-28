import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DeskShell } from "@/components/desk-shell";
import { WorkspaceGate } from "@/components/workspace-gate";

export const Route = createFileRoute("/desk")({ component: DeskLayout });

function DeskLayout() {
  return (
    <WorkspaceGate expect="staff">
      {(actor) => (
        <DeskShell actor={actor}>
          <Outlet />
        </DeskShell>
      )}
    </WorkspaceGate>
  );
}
