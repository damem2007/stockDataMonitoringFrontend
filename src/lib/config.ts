export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8020";
export const DEFAULT_PAGE_SIZE = Number(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE) || 20;
import { Exchange } from "./types";
export const SUPPORTED_MARKETS = ["TSX", "NYSE", "NASDAQ"] as const satisfies readonly Exchange[];
