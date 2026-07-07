import * as Crypto from "expo-crypto";
import { decodeJwt } from "jose";

function decodeDisclosure(disclosure: string): [string, string, unknown] {
  const base64 = disclosure.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const json = atob(padded);
  return JSON.parse(json);
}

async function hashDisclosure(disclosure: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    disclosure,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );

  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function buildDisclosureMap(disclosures: string[]) {
  const entries = await Promise.all(
    disclosures.map(async (disclosure) => {
      const hash = await hashDisclosure(disclosure);
      const decoded = decodeDisclosure(disclosure);
      return [hash, decoded] as const;
    }),
  );

  return new Map(entries);
}

function materializeNode(
  node: unknown,
  disclosuresByHash: Map<string, [string, string, unknown]>,
): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => materializeNode(item, disclosuresByHash));
  }

  if (!node || typeof node !== "object") {
    return node;
  }

  const current = { ...(node as Record<string, unknown>) };

  if (Array.isArray(current._sd)) {
    for (const hash of current._sd) {
      const disclosure = disclosuresByHash.get(String(hash));
      if (!disclosure) continue;

      const [, claimName, claimValue] = disclosure;
      current[claimName] = materializeNode(claimValue, disclosuresByHash);
    }

    delete current._sd;
  }

  for (const [key, value] of Object.entries(current)) {
    current[key] = materializeNode(value, disclosuresByHash);
  }

  delete current._sd_alg;

  return current;
}

export async function parseCredentialToken(
  rawCredential: string,
): Promise<{ vc: any }> {
  if (!rawCredential.includes("~")) {
    const decoded: any = decodeJwt(rawCredential);
    return { vc: decoded.vc ?? decoded };
  }

  const [issuerJwt, ...rest] = rawCredential.split("~");
  const disclosures = rest.filter(Boolean);

  const decodedPayload: any = decodeJwt(issuerJwt);
  const disclosuresByHash = await buildDisclosureMap(disclosures);
  const processed = materializeNode(
    decodedPayload,
    disclosuresByHash,
  ) as Record<string, any>;

  const {
    iss,
    sub,
    iat,
    nbf,
    exp,
    vct,
    _sd,
    _sd_alg,
    credentialSubject: embeddedCredentialSubject,
    ...subjectClaims
  } = processed;

  const credentialSubject =
    embeddedCredentialSubject && typeof embeddedCredentialSubject === "object"
      ? embeddedCredentialSubject
      : subjectClaims;

  return {
    vc: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: processed.jti ?? processed.id,
      type: Array.isArray(processed.type)
        ? processed.type
        : [
            "VerifiableCredential",
            "VerifiableAttestation",
            vct ?? "SDJwtCredential",
          ],
      issuer: processed.issuer ?? iss,
      issuanceDate:
        processed.issuanceDate ??
        (iat ? new Date(iat * 1000).toISOString() : undefined),
      issued:
        processed.issued ??
        (iat ? new Date(iat * 1000).toISOString() : undefined),
      validFrom:
        processed.validFrom ??
        (nbf ? new Date(nbf * 1000).toISOString() : undefined),
      validUntil:
        processed.validUntil ??
        (exp ? new Date(exp * 1000).toISOString() : undefined),
      expirationDate:
        processed.expirationDate ??
        (exp ? new Date(exp * 1000).toISOString() : undefined),
      credentialSchema: processed.credentialSchema,
      credentialSubject: {
        ...credentialSubject,
        id: sub ?? credentialSubject?.id,
      },
    },
  };
}
