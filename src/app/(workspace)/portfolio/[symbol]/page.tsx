import { redirect } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ symbol: string }> }) { const { symbol } = await params; redirect(`/portfolio/${encodeURIComponent(decodeURIComponent(symbol))}/summary`); }
