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
const requireHomeCounts = process.env.JAOTHUI_REQUIRE_HOME_STATS_COUNT === "1";

function assertHomeStats(stats) {
  if (!Array.isArray(stats) || stats.length !== 4) throw new Error("/home must expose four stats");
  const ids = new Set();
  for (const stat of stats) {
    for (const key of ["id", "value", "unit", "label"]) {
      if (typeof stat[key] !== "string") throw new Error(`/home stat missing string ${key}`);
    }
    if (ids.has(stat.id)) throw new Error("/home duplicate stat id");
    ids.add(stat.id);
    if (requireHomeCounts && !("count" in stat)) throw new Error(`/home ${stat.id} missing required new count contract`);
    if ("count" in stat) {
      if (stat.count !== null && (!Number.isSafeInteger(stat.count) || stat.count < 0)) throw new Error(`/home ${stat.id} invalid count`);
      const expected = stat.count === null ? "—" : String(stat.count).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      if (stat.value !== expected) throw new Error(`/home ${stat.id} value/count mismatch`);
    }
    if ("availability" in stat && !["available", "unavailable"].includes(stat.availability)) throw new Error(`/home ${stat.id} invalid availability`);
    if (stat.availability === "unavailable" && stat.count !== null) throw new Error(`/home ${stat.id} unavailable must have null count`);
    if (stat.availability === "available" && stat.count === null) throw new Error(`/home ${stat.id} available must have numeric count`);
    if ("observedAt" in stat && stat.observedAt !== null && (typeof stat.observedAt !== "string" || !Number.isFinite(Date.parse(stat.observedAt)))) throw new Error(`/home ${stat.id} invalid observation timestamp`);
    if (requireHomeCounts && (!("availability" in stat) || !("observedAt" in stat))) throw new Error(`/home ${stat.id} missing availability/observation fields`);
    if (requireHomeCounts && stat.availability === "available" && stat.observedAt === null) throw new Error(`/home ${stat.id} available stat missing observation timestamp`);
  }
  for (const id of ["farmers", "buffalos", "events", "verified"]) if (!ids.has(id)) throw new Error(`/home missing stat ${id}`);
}

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
assertHomeStats(home.stats);
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

console.log(`Phase 4A API contract check passed | Home stats ${requireHomeCounts ? "numeric contract required" : "additive old/new compatible"}`);
