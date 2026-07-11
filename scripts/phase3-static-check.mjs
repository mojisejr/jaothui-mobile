import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = [
  "app/_layout.tsx",
  "app/index.tsx",
  "app/buffalos/index.tsx",
  "app/certs/[microchip].tsx",
  "src/api/client.ts",
  "src/api/jaothui.ts",
  "src/components/BuffaloCard.tsx",
  "src/design/tokens.ts",
  "src/features/home/HomeScreen.tsx",
  "src/features/home/NewsEventRail.tsx",
  "src/features/buffalos/BuffaloListScreen.tsx",
  "src/features/certs/CertDetailScreen.tsx",
  "src/types/mobile-api.ts",
  ".env.example",
];

const failures = [];

for (const file of required) {
  if (!existsSync(path.join(root, file))) failures.push(`missing ${file}`);
}

for (const file of [
  "src/api/client.ts",
  "src/api/jaothui.ts",
  "src/features/home/HomeScreen.tsx",
  "src/features/buffalos/BuffaloListScreen.tsx",
  "src/features/certs/CertDetailScreen.tsx",
]) {
  const content = readFileSync(path.join(root, file), "utf8");
  if (content.includes("trpc") || content.includes("/api/trpc")) {
    failures.push(`forbidden tRPC reference in ${file}`);
  }
  if (content.includes("session_token") || content.includes("access_token")) {
    failures.push(`auth token leakage in Phase 3 file ${file}`);
  }
}

const envExample = readFileSync(path.join(root, ".env.example"), "utf8");
if (!envExample.includes("EXPO_PUBLIC_JAOTHUI_API_BASE_URL=")) {
  failures.push("missing EXPO_PUBLIC_JAOTHUI_API_BASE_URL in .env.example");
}

if (failures.length) {
  console.error("Phase 3 static check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Phase 3 static check passed");
