"use client";

import { ScreenLoader, ToastStack } from "@/components/ui/feedback";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/providers/toast-provider";
import { useWorkspace } from "@/providers/workspace-provider";

export function WorkspaceChrome({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const workspace = useWorkspace();
  const { toasts, dismissToast } = useToast();
  if (session.initializing || workspace.initializing) return <ScreenLoader label="Loading workspace" />;
  return <>{(session.appLoading || workspace.appLoading) && <ScreenLoader label="Syncing workspace" />}<ToastStack toasts={toasts} dismissToast={dismissToast} />{children}</>;
}
