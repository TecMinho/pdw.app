export interface CredentialSubjectField {
  path: string;
  value: unknown;
  label: string;
}

type ClaimDisplay = {
  name?: unknown;
  locale?: unknown;
};

const CLAIM_METADATA_KEYS = new Set([
  "display",
  "mandatory",
  "value_type",
  "order",
  "description",
]);

export function formatCredentialValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function flattenSubject(
  value: unknown,
  prefix = "",
): { path: string; value: unknown }[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [{ path: prefix, value }] : [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      const nested = flattenSubject(child, path);
      return nested.length > 0 ? nested : [{ path, value: child }];
    }
    return [{ path, value: child }];
  });
}

function getAtPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, value);
}

function isClaimDescriptor(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function collectMetadata(
  claims: unknown,
  subject: unknown,
  prefix = "",
): Map<string, ClaimDisplay[]> {
  const result = new Map<string, ClaimDisplay[]>();
  if (Array.isArray(claims)) {
    for (const descriptor of claims) {
      if (!isClaimDescriptor(descriptor) || !Array.isArray(descriptor.path)) {
        continue;
      }

      const segments = descriptor.path.filter(
        (part: unknown): part is string => typeof part === "string",
      );
      if (segments[0] === "vc") segments.shift();
      if (segments[0] === "credentialSubject") segments.shift();
      if (segments.length === 0) continue;

      const path = segments.join(".");
      if (getAtPath(subject, path) === undefined) continue;
      const displays = Array.isArray(descriptor.display)
        ? (descriptor.display as ClaimDisplay[])
        : [];
      result.set(path, displays);
    }
    return result;
  }
  if (!isClaimDescriptor(claims)) return result;

  for (const [key, descriptor] of Object.entries(claims)) {
    if (CLAIM_METADATA_KEYS.has(key)) continue;

    // Some issuers publish dotted claim paths instead of a nested claim tree.
    const path = prefix ? `${prefix}.${key}` : key;
    const candidatePaths = key.includes(".") ? [key] : [path];
    const actualPath = candidatePaths.find((candidate) =>
      candidate.split(".").every((_, index, parts) => {
        const prefixPath = parts.slice(0, index + 1).join(".");
        return getAtPath(subject, prefixPath) !== undefined;
      }),
    );
    if (!actualPath) continue;

    const subjectValue = getAtPath(subject, actualPath);
    const displays = isClaimDescriptor(descriptor)
      ? Array.isArray(descriptor.display)
        ? (descriptor.display as ClaimDisplay[])
        : []
      : [];

    if (
      subjectValue !== null &&
      typeof subjectValue === "object" &&
      !Array.isArray(subjectValue) &&
      isClaimDescriptor(descriptor)
    ) {
      const nested = collectMetadata(descriptor, subject, actualPath);
      for (const [nestedPath, nestedDisplays] of nested) {
        result.set(nestedPath, nestedDisplays);
      }
      // A parent display may describe a structured claim. Its flattened leaves
      // still use their paths unless the issuer supplies leaf-level displays.
      continue;
    }

    result.set(actualPath, displays);
  }
  return result;
}

function localizedLabel(displays: ClaimDisplay[], locale: string): string | undefined {
  const named = displays.filter(
    (display) => typeof display?.name === "string" && display.name.length > 0,
  );
  if (named.length === 0) return undefined;

  const language = locale.toLowerCase().split(/[-_]/)[0];
  const exact = (tag: string) =>
    named.find(
      (display) =>
        typeof display.locale === "string" &&
        display.locale.toLowerCase().replace(/_/g, "-") === tag,
    );
  const baseLanguage = (tag: string) =>
    named.find(
      (display) =>
        typeof display.locale === "string" &&
        display.locale.toLowerCase().split(/[-_]/)[0] === tag,
    );

  const selected =
    exact(locale.toLowerCase().replace(/_/g, "-")) ??
    baseLanguage(language) ??
    exact("en-gb") ??
    exact("en") ??
    baseLanguage("en");
  return selected?.name as string | undefined;
}

export function flattenCredentialSubject(
  subject: unknown,
  claimsMetadata: unknown,
  locale: string,
): CredentialSubjectField[] {
  const fields = flattenSubject(subject);
  const metadata = collectMetadata(claimsMetadata, subject);
  const metadataOrder = new Map<string, number>();
  let index = 0;
  for (const path of metadata.keys()) metadataOrder.set(path, index++);

  return fields
    .map(({ path, value }) => ({
      path,
      value,
      label: localizedLabel(metadata.get(path) ?? [], locale) ?? path,
    }))
    .sort((left, right) => {
      const leftOrder = metadataOrder.get(left.path);
      const rightOrder = metadataOrder.get(right.path);
      if (leftOrder === undefined) return rightOrder === undefined ? 0 : 1;
      if (rightOrder === undefined) return -1;
      return leftOrder - rightOrder;
    });
}
