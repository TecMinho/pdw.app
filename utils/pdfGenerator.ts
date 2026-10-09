import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Platform, Share } from "react-native";

interface Credential {
  id: string;
  issuer?: string | { id?: string };
  status?: string;
  issuanceDate?: string;
  validFrom?: string;
  expirationDate?: string;
  validUntil?: string;
  name?: string;
  logo?: string;
  templateId?: string;
  jwt?: string;
  credentialSubject?: { [key: string]: any };
}

export type PdfLabels = {
  eyebrow: string;
  issuedTo: string;
  intro: string;
  holder: string;
  course: string;
  classification: string;
  issued: string;
  validUntil: string;
  footer: string;
  fallbackTitle: string;
  shareTitle: string;
  missingCredentialTitle: string;
  missingCredentialMessage: string;
  cacheUnavailableMessage: string;
  sharingUnavailableMessage: string;
  errorTitle: string;
  unknownErrorMessage: string;
  createdAtLabel?: string;
  createdAt?: Date | string;
  fieldLabels?: Record<string, string>;
  dateLocale?: string;
};

const DEFAULT_PDF_LABELS: PdfLabels = {
  eyebrow: "VERIFIABLE CREDENTIAL",
  issuedTo: "Issued to",
  intro: "This credential contains the information shown below.",
  holder: "Holder",
  course: "Course",
  classification: "Classification",
  issued: "Issued",
  validUntil: "Valid until",
  footer: "Digitally verifiable credential",
  fallbackTitle: "Verifiable Credential",
  shareTitle: "Share credential",
  missingCredentialTitle: "PDF",
  missingCredentialMessage: "Credential data could not be found.",
  cacheUnavailableMessage: "The app cache is not available.",
  sharingUnavailableMessage: "Native sharing is not available in this Expo Go.",
  errorTitle: "Could not generate PDF",
  unknownErrorMessage: "Unknown error while generating the PDF.",
  createdAtLabel: "Created at",
  dateLocale: "en-GB",
};

const escapeHtml = (value: unknown): string =>
  String(value ?? "N/A")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const TECHNICAL_FIELD_NAMES = new Set([
  "@context",
  "accesstoken",
  "credentialschema",
  "credential_id",
  "credentialid",
  "did",
  "id",
  "identifier",
  "issuer",
  "jti",
  "jwt",
  "proof",
  "statuslistcredential",
  "sub",
  "type",
]);

const isTechnicalField = (key: string): boolean => {
  const lowerKey = key.toLowerCase();

  return (
    TECHNICAL_FIELD_NAMES.has(lowerKey) ||
    /identifier|jwt|proof|verificationmethod|credentialschema|accesstoken|statuslist/.test(
      lowerKey,
    ) ||
    /(?:Id|ID|Did|DID)$/.test(key) ||
    /(?:Issuer|Schema)$/.test(key)
  );
};

const formatDate = (
  value: string | undefined,
  locale = "en-GB",
): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(locale);
};

const formatDateTime = (
  value: Date | string | undefined,
  locale = "en-GB",
): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString(locale, {
        dateStyle: "short",
        timeStyle: "short",
      });
};

const firstValue = <T>(value: T | T[] | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : value;

const humanizeKey = (key: string, labels?: PdfLabels): string =>
  labels?.fieldLabels?.[key.toLowerCase()] ??
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\s*\w/, (character) => character.toUpperCase());

function getCredentialHighlights(credential: Credential, labels: PdfLabels) {
  const subject = credential.credentialSubject ?? {};
  const achieved = firstValue(subject.achieved);
  const assessment = firstValue(achieved?.wasDerivedFrom);
  const person = subject.person;

  return [
    {
      label: labels.holder,
      value:
        subject.name ??
        subject.fullName ??
        person?.name ??
        person?.fullName,
    },
    {
      label: labels.course,
      value: achieved?.title ?? subject.courseName ?? subject.course?.name,
    },
    {
      label: labels.classification,
      value: assessment?.grade ?? subject.grade ?? subject.classification,
    },
    {
      label: labels.issued,
      value: formatDate(
        credential.issuanceDate ?? credential.validFrom,
        labels.dateLocale,
      ),
    },
    {
      label: labels.validUntil,
      value: formatDate(
        credential.expirationDate ?? credential.validUntil,
        labels.dateLocale,
      ),
    },
    {
      label: labels.createdAtLabel ?? "Created at",
      value: formatDateTime(labels.createdAt ?? new Date(), labels.dateLocale),
    },
  ].filter(({ value }) => value !== undefined && value !== null && value !== "");
}

/**
 * Safely renders any credential field to HTML.
 */
function renderSubjectFields(
  data: any,
  level = 0,
  excludedKeys = new Set<string>(),
  labels: PdfLabels = DEFAULT_PDF_LABELS,
): string {
  if (typeof data !== "object" || data === null) {
    return `<span class="value">${escapeHtml(data)}</span>`;
  }

  return Object.entries(data)
    .map(([key, value]) => {
      if (isTechnicalField(key) || excludedKeys.has(key.toLowerCase())) {
        return "";
      }

      const label = humanizeKey(key, labels);
      const isNested = typeof value === "object" && value !== null;

      if (Array.isArray(value)) {
        const items = value
          .map((item) => {
            if (typeof item === "object" && item !== null) {
              return `<div class="nested-card">${renderSubjectFields(
                item,
                level + 1,
                excludedKeys,
                labels,
              )}</div>`;
            }
            return `<span class="array-value">${escapeHtml(item)}</span>`;
          })
          .join("");
        return `<div class="field nested-field"><span class="label">${escapeHtml(
          label,
        )}</span><div class="nested-values">${items}</div></div>`;
      }

      return `<div class="field">
                <span class="label">${escapeHtml(label)}</span>
                ${
                  isNested
                    ? `<div class="nested-values">${renderSubjectFields(
                        value,
                        level + 1,
                        excludedKeys,
                        labels,
                      )}</div>`
                    : `<span class="value">${escapeHtml(value)}</span>`
                }
              </div>`;
    })
    .join("");
}

/**
 * Builds the generic HTML displayed in the in-app PDF preview and generated PDF.
 */
export async function buildCredentialPdfPreviewHtml(
  credential: Credential,
  labels: PdfLabels = DEFAULT_PDF_LABELS,
): Promise<string> {
  let logoSrc = "";
  try {
    logoSrc = await loadCredentialLogoAsBase64(credential.logo);
  } catch {
    // Keep the preview usable if the bundled logo cannot be loaded.
  }
  return buildGenericCredentialPdfHtml(credential, logoSrc, labels);
}

export function buildGenericCredentialPdfHtml(
  credential: Credential,
  logoSrc: string,
  labels: PdfLabels = DEFAULT_PDF_LABELS,
): string {
  const effectiveLabels: PdfLabels = {
    ...DEFAULT_PDF_LABELS,
    ...labels,
    createdAt: labels.createdAt ?? new Date(),
  };
  const title = credential.name || effectiveLabels.fallbackTitle;
  const highlights = getCredentialHighlights(credential, effectiveLabels);
  const holder = highlights.find(({ label }) => label === effectiveLabels.holder)?.value;
  const course = highlights.find(({ label }) => label === effectiveLabels.course)?.value;
  const detailHighlights = highlights.filter(
    ({ label }) =>
      label !== effectiveLabels.holder && label !== effectiveLabels.course,
  );
  const excludedSubjectKeys = new Set([
    "name",
    "fullname",
    "achieved",
    "coursename",
    "course",
    "grade",
    "classification",
  ]);

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </head>
      <body>
        <div class="certificate">
          ${logoSrc ? `<div class="logo-wrapper"><img src="${escapeHtml(logoSrc)}" alt="Issuer logo" class="logo" /></div>` : ""}
          <div class="eyebrow">${escapeHtml(effectiveLabels.eyebrow)}</div>
          <h1>${escapeHtml(title)}</h1>
          ${course ? `<div class="course">${escapeHtml(course)}</div>` : ""}
          ${
            holder
              ? `<p class="intro">${escapeHtml(effectiveLabels.issuedTo)}</p>
                 <div class="holder">${escapeHtml(holder)}</div>`
              : ""
          }
          ${
            holder || course
              ? `<p class="intro">${escapeHtml(effectiveLabels.intro)}</p>`
              : ""
          }
          <div class="details">
            ${detailHighlights
              .map(
                ({ label, value }) => `
                  <div class="field">
                    <span class="label">${escapeHtml(label)}</span>
                    <span class="value">${escapeHtml(value)}</span>
                  </div>`,
              )
              .join("")}
            ${renderSubjectFields(
              credential.credentialSubject ?? {},
              0,
              excludedSubjectKeys,
              effectiveLabels,
            )}
          </div>
          <div class="footer">${escapeHtml(effectiveLabels.footer)}</div>
        </div>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
            padding: 32px; background-color: #ffffff; color: #333333;
            font-size: 14px; line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word;
          }
          .certificate { min-height: 760px; border: 2px solid #005b9a; padding: 40px 46px; text-align: center; position: relative; }
          .logo-wrapper { text-align: center; margin-bottom: 24px; }
          .logo { width: 180px; height: auto; max-height: 90px; object-fit: contain; }
          .eyebrow { color: #0072b8; font-size: 11px; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 16px; }
          h1 { color: #005b9a; margin-bottom: 24px; text-align: center; font-size: 25px; letter-spacing: 1px; font-weight: 700; word-break: break-word; }
          .course { color: #17324d; font-size: 22px; font-weight: 700; margin: 0 auto 24px; max-width: 480px; overflow-wrap: anywhere; }
          .intro { color: #51687b; font-size: 14px; margin: 9px 0; }
          .holder { color: #005b9a; font-size: 25px; font-weight: 700; margin: 8px 0; overflow-wrap: anywhere; }
          .details { text-align: left; margin: 34px auto 0; max-width: 470px; border-top: 1px solid #c8d8e3; }
          .field { display: flex; gap: 16px; align-items: flex-start; padding: 9px 0; border-bottom: 1px solid #e2ebf0; font-size: 12px; page-break-inside: avoid; }
          .label { color: #51687b; font-weight: 700; flex: 0 0 34%; }
          .value, .array-value { color: #17324d; flex: 1; min-width: 0; overflow-wrap: anywhere; }
          .nested-values { flex: 1; min-width: 0; }
          .nested-card { border-left: 3px solid #cbd9e5; padding-left: 12px; margin-bottom: 8px; }
          .nested-card .field { padding: 5px 0; margin-bottom: 0; }
          .nested-card .label { flex-basis: 40%; font-weight: 600; }
          .footer { position: absolute; left: 46px; right: 46px; bottom: 24px; color: #9cccf0; font-size: 10px; }
          @media print { body { padding: 24px; } }
        </style>
      </body>
    </html>`;
}

/**
 * Loads a bundled PNG asset and returns a data:image/png;base64,... string
 * in a way that works in Expo Go / dev builds.
 */
async function loadLogoAsBase64(): Promise<string> {
  const asset = Asset.fromModule(require("@/assets/images/logo.png"));
  await asset.downloadAsync();

  const candidateUris = [asset.localUri, asset.uri].filter(
    (uri): uri is string => Boolean(uri),
  );

  if (!candidateUris.length) {
    throw new Error("Logo URI is unavailable.");
  }

  for (const uri of candidateUris) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (base64) {
        return `data:image/png;base64,${base64}`;
      }
    } catch {
      // Try next candidate URI.
    }
  }

  if (FileSystem.cacheDirectory && candidateUris.length) {
    const extension = asset.type ?? "png";
    const cacheUri = `${FileSystem.cacheDirectory}pdf-logo-${asset.hash ?? Date.now()}.${extension}`;

    for (const uri of candidateUris) {
      try {
        await FileSystem.copyAsync({ from: uri, to: cacheUri });
        const base64 = await FileSystem.readAsStringAsync(cacheUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (base64) {
          return `data:image/${extension};base64,${base64}`;
        }
      } catch {
        // Keep trying alternatives.
      }
    }
  }

  throw new Error("Unable to load logo image as base64.");
}

async function loadCredentialLogoAsBase64(logoUri?: string): Promise<string> {
  if (!logoUri) return loadLogoAsBase64();
  if (
    /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(
      logoUri,
    )
  ) {
    return logoUri;
  }

  const candidateUri = logoUri;
  const mimeType = logoUri.toLowerCase().endsWith(".jpg") ||
    logoUri.toLowerCase().endsWith(".jpeg")
    ? "image/jpeg"
    : "image/png";

  try {
    const base64 = await FileSystem.readAsStringAsync(candidateUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (base64) return `data:${mimeType};base64,${base64}`;
  } catch {
    // Remote issuer logos need to be downloaded before being embedded in HTML.
  }

  if (FileSystem.cacheDirectory) {
    const extension = mimeType === "image/jpeg" ? "jpg" : "png";
    const cacheUri = `${FileSystem.cacheDirectory}pdf-issuer-logo-${Date.now()}.${extension}`;
    try {
      await FileSystem.downloadAsync(candidateUri, cacheUri);
      const base64 = await FileSystem.readAsStringAsync(cacheUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (base64) return `data:${mimeType};base64,${base64}`;
    } catch {
      // Fall back to the bundled application logo below.
    }
  }

  return loadLogoAsBase64();
}

async function openGeneratedPdf(
  uri: string,
  labels: PdfLabels,
): Promise<void> {
  if (!FileSystem.cacheDirectory) {
    throw new Error(labels.cacheUnavailableMessage);
  }

  // expo-print stores the generated file under cache/Print. Copy it to the
  // app cache root so Expo Go/iOS can share it reliably. Android additionally
  // needs the resulting file converted to a content:// URI.
  const writableUri = `${FileSystem.cacheDirectory}credential-${Date.now()}.pdf`;
  await FileSystem.copyAsync({ from: uri, to: writableUri });
  let shareUri = writableUri;
  if (Platform.OS === "android") {
    shareUri = await FileSystem.getContentUriAsync(writableUri);
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(shareUri, {
      mimeType: "application/pdf",
      dialogTitle: labels.shareTitle,
      // iOS uses UTI, rather than mimeType, to identify the shared file.
      UTI: "com.adobe.pdf",
    });
    return;
  }

  if (Platform.OS === "ios") {
    throw new Error(labels.sharingUnavailableMessage);
  }

  // Fallback for an installed native build that does not include Expo Sharing.
  // React Native's native share sheet can still send the local PDF to Files.
  await Share.share({ url: shareUri, title: labels.shareTitle });
}

/**
 * Generates a PDF document from credential data and opens the sharing dialog.
 */
export async function generateAndSharePDF(
  credential: Credential | undefined,
  labels: PdfLabels = DEFAULT_PDF_LABELS,
): Promise<string | null> {
  const effectiveLabels: PdfLabels = { ...DEFAULT_PDF_LABELS, ...labels };

  if (!credential) {
    Alert.alert(
      effectiveLabels.missingCredentialTitle,
      effectiveLabels.missingCredentialMessage,
    );
    return null;
  }

  try {
    let logoSrc = "";

    // Avoid failing PDF generation if the issuer logo cannot be read.
    try {
      logoSrc = await loadCredentialLogoAsBase64(credential.logo);
    } catch {
      logoSrc = "";
    }

    const { uri } = await Print.printToFileAsync({
      html: buildGenericCredentialPdfHtml(credential, logoSrc, labels),
      width: 595, // A4 width (pt)
      height: 842, // A4 height (pt)
    });

    await openGeneratedPdf(uri, effectiveLabels);
    return uri;
  } catch (error) {
    console.error("Erro ao criar o PDF:", error);
    const message =
      error instanceof Error
        ? error.message
        : effectiveLabels.unknownErrorMessage;
    Alert.alert(effectiveLabels.errorTitle, message);
    return null;
  }
}
