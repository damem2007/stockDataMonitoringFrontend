import { AuthGuard } from "@/components/navigation/auth-guard";
export default function PortfolioLayout({ children }: { children: React.ReactNode }) { return <AuthGuard>{children}</AuthGuard>; }
