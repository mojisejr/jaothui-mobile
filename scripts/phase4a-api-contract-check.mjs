import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const envPath = join(repoRoot, ".env");

function readEnvValue(key) {
  if (process.env[key]) return process.env[key];
  if (!existsSync(envPath)) return undefined;

  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));
  if (!line) return undefined;

  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

const apiBaseUrl = (readEnvValue("EXPO_PUBLIC_JAOTHUI_API_BASE_URL") || "http://localhost:3020").replace(
  /\/$/,
  ""
);

const MICROCHIP_PATTERN = /^\d{12,}$/;
const CERT_FIXTURE = "764040226601197";

async function mobileGet(path) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`${path} failed: ${payload.error?.code || response.status}`);
  }
  return payload.data;
}

function assertBuffaloCardShape(buffalo, source) {
  const required = ["microchip", "name", "birthdate", "birthday", "ageMonths", "href"];
  for (const field of required) {
    if (!(field in buffalo)) {
      throw new Error(`${source} missing field: ${field}`);
    }
  }
}

function classifyDirtyRows(items) {
  return items.filter((item) => {
    const microchipDirty = item.microchip && !MICROCHIP_PATTERN.test(String(item.microchip));
    const nameLooksLikeMicrochip = item.name && MICROCHIP_PATTERN.test(String(item.name));
    return microchipDirty || nameLooksLikeMicrochip;
  });
}

function assertNewsEventShape(item, source) {
  const required = [
    "id",
    "title",
    "slug",
    "type",
    "typeLabel",
    "featured",
    "priority",
    "publishedAt",
    "eventStartAt",
    "eventEndAt",
    "displayDate",
    "location",
    "excerpt",
    "coverImageUrl",
    "ctaLabel",
    "ctaUrl",
  ];

  for (const field of required) {
    if (!(field in item)) {
      throw new Error(`${source} missing field: ${field}`);
    }
  }
}

const home = await mobileGet("/api/mobile/v1/home");
if (!Array.isArray(home.featured)) throw new Error("/home featured is not an array");
for (const [index, buffalo] of home.featured.entries()) {
  assertBuffaloCardShape(buffalo, `/home featured[${index}]`);
}

const newsEvents = await mobileGet("/api/mobile/v1/news-events");
if (!Array.isArray(newsEvents.items)) throw new Error("/news-events items is not an array");
for (const [index, item] of newsEvents.items.entries()) {
  assertNewsEventShape(item, `/news-events items[${index}]`);
}

const list = await mobileGet("/api/mobile/v1/buffalos?page=1&sortBy=latest");
if (!Array.isArray(list.items)) throw new Error("/buffalos items is not an array");
for (const [index, buffalo] of list.items.entries()) {
  assertBuffaloCardShape(buffalo, `/buffalos items[${index}]`);
}

const cert = await mobileGet(`/api/mobile/v1/certs/${CERT_FIXTURE}`);
assertBuffaloCardShape(cert.buffalo, `/certs/${CERT_FIXTURE} buffalo`);

const dirtyRows = classifyDirtyRows(list.items);
if (dirtyRows.length > 0) {
  console.log(
    `SOURCE_DATA_DIRTY: ${dirtyRows.length} /buffalos row(s) have semantic identity anomalies; first token=${dirtyRows[0].tokenId}`
  );
}

console.log("Phase 4A API contract check passed");
