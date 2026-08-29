import { TopNav } from "@/components/navigation/top-nav";
import { WorkspaceChrome } from "@/components/navigation/workspace-chrome";
import { SessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { WorkspaceProvider } from "@/providers/workspace-provider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><ToastProvider><SessionProvider><WorkspaceProvider><TopNav/><WorkspaceChrome>{children}</WorkspaceChrome></WorkspaceProvider></SessionProvider></ToastProvider></ThemeProvider>;
}
