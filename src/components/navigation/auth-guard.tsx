"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ScreenLoader } from "@/components/ui/feedback";
import { useSession } from "@/providers/session-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!session.initializing && !session.user) router.replace(`/?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router, session.initializing, session.user]);
  if (session.initializing || !session.user) return <ScreenLoader label="Checking account" />;
  return children;
}
