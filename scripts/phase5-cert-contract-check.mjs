import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const envPath = join(repoRoot, ".env");
const SUCCESS_FIXTURE = "764040226601197";
const UNAVAILABLE_FIXTURE = "764040226300035";

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

async function mobileGet(path) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json();
  return { response, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDetailShape(payload, source) {
  assert(payload.ok, `${source} failed: ${payload.error?.code || "UNKNOWN"}`);
  assert(payload.data?.buffalo, `${source} missing buffalo`);
  assert(Array.isArray(payload.data.rewards), `${source} rewards is not an array`);

  const buffalo = payload.data.buffalo;
  const fields = [
    "ageMonths",
    "microchip",
    "birthdate",
    "sex",
    "motherId",
    "fatherId",
    "origin",
    "dna",
    "height",
    "color",
    "certificate",
    "actions",
  ];
  for (const field of fields) {
    assert(field in buffalo, `${source} missing parity field: ${field}`);
  }
  assert(buffalo.actions?.certificate, `${source} missing certificate action`);
  assert(buffalo.actions?.share, `${source} missing share action`);
}

const successDetail = await mobileGet(`/api/mobile/v1/certs/${SUCCESS_FIXTURE}`);
assertDetailShape(successDetail.payload, `success fixture ${SUCCESS_FIXTURE}`);

const successCertificate = await mobileGet(`/api/mobile/v1/certs/${SUCCESS_FIXTURE}/certificate`);
assert(successCertificate.payload.ok, `success certificate failed: ${successCertificate.payload.error?.code || "UNKNOWN"}`);
assert(successCertificate.payload.data?.mimeType?.startsWith("image/"), "success certificate missing image mime type");
assert(successCertificate.payload.data?.imageBase64?.length > 1000, "success certificate image is unexpectedly small");

const unavailableDetail = await mobileGet(`/api/mobile/v1/certs/${UNAVAILABLE_FIXTURE}`);
assertDetailShape(unavailableDetail.payload, `unavailable fixture ${UNAVAILABLE_FIXTURE}`);

const unavailableCertificate = await mobileGet(`/api/mobile/v1/certs/${UNAVAILABLE_FIXTURE}/certificate`);
assert(!unavailableCertificate.payload.ok, "unavailable certificate unexpectedly succeeded");
assert(
  unavailableCertificate.payload.error?.code === "CERTIFICATE_UNAVAILABLE",
  `unavailable certificate returned ${unavailableCertificate.payload.error?.code || unavailableCertificate.response.status}`
);

console.log(
  [
    "Phase 5 cert contract check passed",
    `success=${SUCCESS_FIXTURE}`,
    `unavailable=${UNAVAILABLE_FIXTURE}`,
    "fields=age,signature,birthdate,sex,parents,origin,dna,height,color,rewards,certificate",
  ].join(" | ")
);
