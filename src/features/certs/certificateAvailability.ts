function hasDisplayValue(value: unknown) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text.length > 0 && text !== "N/A";
}

export function hasCertificateSummary(certificate: unknown) {
  if (!certificate || typeof certificate !== "object") return false;
  return "microchip" in certificate && hasDisplayValue((certificate as { microchip?: unknown }).microchip);
}
