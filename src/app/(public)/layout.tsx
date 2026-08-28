import { SessionProvider } from "@/providers/session-provider";
import { ToastProvider } from "@/providers/toast-provider";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider><SessionProvider>{children}</SessionProvider></ToastProvider>;
}
