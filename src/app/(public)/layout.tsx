import { SessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><ToastProvider><SessionProvider>{children}</SessionProvider></ToastProvider></ThemeProvider>;
}
