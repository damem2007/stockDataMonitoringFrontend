import { rm } from "node:fs/promises";

for (const target of [".next", "tsconfig.tsbuildinfo"]) {
  await rm(new URL(`../${target}`, import.meta.url), { recursive: true, force: true });
}
