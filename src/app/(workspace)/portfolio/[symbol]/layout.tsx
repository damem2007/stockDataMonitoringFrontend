import { InstrumentShell } from "@/components/instrument/shell/instrument-shell";
import { InstrumentProvider } from "@/providers/instrument-provider";

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const decoded = decodeURIComponent(symbol);
  return <InstrumentProvider symbol={decoded} context="portfolio"><InstrumentShell>{children}</InstrumentShell></InstrumentProvider>;
}
