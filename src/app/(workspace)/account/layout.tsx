import { AuthGuard } from "@/components/navigation/auth-guard";
export default function AccountLayout({ children }: { children: React.ReactNode }) { return <AuthGuard>{children}</AuthGuard>; }
