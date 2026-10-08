import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Platform, Share } from "react-native";
import { getCredentialTemplateId } from "@/utils/credentialTemplates";

interface Credential {
  id: string;
  issuer?: string | { id?: string };
  status?: string;
  issuanceDate?: string;
  validFrom?: string;
  expirationDate?: string;
  validUntil?: string;
  name?: string;
  templateId?: string;
  credentialSubject?: { [key: string]: any };
}

const escapeHtml = (value: unknown): string =>
  String(value ?? "N/A")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatDate = (value: string | undefined): string => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("pt-PT");
};

function getCourseFields(credential: Credential) {
  const subject = credential.credentialSubject ?? {};
  const achieved = Array.isArray(subject.achieved)
    ? subject.achieved[0]
    : subject.achieved;
  const derivedFrom = Array.isArray(achieved?.wasDerivedFrom)
    ? achieved.wasDerivedFrom[0]
    : achieved?.wasDerivedFrom;
  const holder =
    subject.name ??
    subject.fullName ??
    subject.person?.name ??
    subject.person?.fullName ??
    subject.identifier?.value ??
    subject.id ??
    "N/A";

  return {
    holder,
    course: achieved?.title ?? subject.courseName ?? credential.name ?? "N/A",
    assessment: derivedFrom?.grade ?? "N/A",
    issued: formatDate(credential.issuanceDate ?? credential.validFrom),
    expires: formatDate(credential.expirationDate ?? credential.validUntil),
    issuer: "TecMinho",
    id: credential.id,
  };
}

export function buildTecMinhoCoursePdfHtml(
  credential: Credential,
  logoSrc = "",
): string {
  const fields = getCourseFields(credential);
  const field = (label: string, value: unknown) => `
    <div class="field">
      <span class="label">${escapeHtml(label)}</span>
      <span class="value">${escapeHtml(value)}</span>
    </div>`;

  return `
    <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
      <body>
        <div class="certificate">
          ${logoSrc ? `<img src="${logoSrc}" alt="TecMinho" class="logo" />` : ""}
          <div class="eyebrow">TECMINHO · UNIVERSIDADE DO MINHO</div>
          <h1>CREDENCIAL DE CURSO</h1>
          <div class="course">${escapeHtml(fields.course)}</div>
          <p class="intro">Certifica-se que</p>
          <div class="holder">${escapeHtml(fields.holder)}</div>
          <p class="intro">concluiu a formação indicada nesta credencial.</p>
          <div class="details">
            ${field("Avaliação", fields.assessment)}
            ${field("Data de emissão", fields.issued)}
            ${field("Válida até", fields.expires)}
            ${field("Entidade emissora", fields.issuer)}
          </div>
          <div class="footer">Credencial digital verificável · TecMinho</div>
        </div>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 42px; font-family: Arial, sans-serif; color: #17324d; background: #fff; }
          .certificate { min-height: 720px; border: 2px solid #005b9a; padding: 38px 42px; text-align: center; position: relative; }
          .logo { width: 180px; height: auto; max-height: 90px; object-fit: contain; margin-bottom: 26px; }
          .eyebrow { color: #0072b8; font-size: 11px; letter-spacing: 1.5px; font-weight: bold; }
          h1 { color: #005b9a; font-size: 25px; letter-spacing: 1px; margin: 18px 0 26px; }
          .course { color: #17324d; font-size: 22px; font-weight: bold; margin: 0 auto 24px; max-width: 480px; }
          .intro { color: #51687b; font-size: 14px; margin: 9px 0; }
          .holder { color: #005b9a; font-size: 25px; font-weight: bold; margin: 8px 0; }
          .details { text-align: left; margin: 34px auto 0; max-width: 470px; border-top: 1px solid #c8d8e3; }
          .field { display: flex; gap: 16px; padding: 9px 0; border-bottom: 1px solid #e2ebf0; font-size: 12px; }
          .label { color: #51687b; font-weight: bold; width: 130px; }
          .value { color: #17324d; flex: 1; word-break: break-word; }
          .footer { position: absolute; left: 42px; right: 42px; bottom: 24px; color: #6f8493; font-size: 10px; }
        </style>
      </body>
    </html>`;
}

/**
 * Safely renders any credential field to HTML.
 */
function renderSubjectFields(data: any, level = 0): string {
  if (typeof data !== "object" || data === null) {
    return `<span class="value">${escapeHtml(data)}</span>`;
  }

  return Object.entries(data)
    .map(([key, value]) => {
      const indent = "&nbsp;".repeat(level * 4);
      const isNested = typeof value === "object" && value !== null;

      if (Array.isArray(value)) {
        const items = value
          .map((item) => {
            return `<div class="field">${renderSubjectFields(
              item,
              level + 1,
            )}</div>`;
          })
          .join("");
        return `<div class="field"><span class="label">${indent}${key}:</span>${items}</div>`;
      }

      const safeKey = String(key)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      return `<div class="field">
                <span class="label">${indent}${safeKey}:</span>
                ${
                  isNested
                    ? renderSubjectFields(value, level + 1)
                    : `<span class="value">${escapeHtml(value)}</span>`
                }
              </div>`;
    })
    .join("");
}

/**
 * Builds the HTML displayed in the in-app PDF preview.
 * The TecMinho certificate uses the same template as the generated PDF.
 */
export async function buildCredentialPdfPreviewHtml(
  credential: Credential,
): Promise<string> {
  if (
    credential.templateId === "tecminho-course" ||
    getCredentialTemplateId(credential) ===
      "tecminho-course"
  ) {
    let logoSrc = "";
    try {
      logoSrc = await loadTecMinhoLogoAsBase64();
    } catch {
      // Keep the preview usable if the bundled logo cannot be loaded.
    }
    return buildTecMinhoCoursePdfHtml(credential, logoSrc);
  }

  let logoSrc = "";
  try {
    logoSrc = await loadLogoAsBase64();
  } catch {
    // Keep the preview usable if the bundled logo cannot be loaded.
  }
  return buildGenericCredentialPdfHtml(credential, logoSrc);
}

function buildGenericCredentialPdfHtml(
  credential: Credential,
  logoSrc: string,
): string {
  return `
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </head>
      <body>
        ${logoSrc ? `<div class="logo-wrapper"><img src="${logoSrc}" alt="Logo" class="logo" /></div>` : ""}
        <h1>Credential Details</h1>
        <div class="field">
          <span class="label">ID:</span>
          <span class="value">${escapeHtml(credential.id)}</span>
        </div>
        ${renderSubjectFields(credential.credentialSubject ?? {})}
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
            padding: 40px 32px; background-color: #ffffff; color: #333333;
            font-size: 14px; line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word;
          }
          .logo-wrapper { text-align: center; margin-bottom: 24px; }
          .logo { width: 120px; height: auto; max-width: 100%; }
          h1 { color: #005BAC; margin-bottom: 24px; text-align: center; font-size: 22px; font-weight: 600; }
          .field { margin-bottom: 12px; page-break-inside: avoid; max-width: 100%; }
          .label { font-weight: 600; color: #222222; display: inline-block; min-width: 140px; vertical-align: top; }
          .value { color: #555555; display: inline-block; max-width: 70%; word-break: break-word; }
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

async function loadTecMinhoLogoAsBase64(): Promise<string> {
  const asset = Asset.fromModule(require("@/assets/images/logos/tecminho.png"));
  await asset.downloadAsync();
  const candidateUris = [asset.localUri, asset.uri].filter(
    (uri): uri is string => Boolean(uri),
  );

  for (const uri of candidateUris) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (base64) return `data:image/png;base64,${base64}`;
    } catch {
      // Try the next candidate URI.
    }
  }

  if (FileSystem.cacheDirectory) {
    const cacheUri = `${FileSystem.cacheDirectory}pdf-tecminho-logo-${asset.hash ?? Date.now()}.png`;
    for (const uri of candidateUris) {
      try {
        await FileSystem.copyAsync({ from: uri, to: cacheUri });
        const base64 = await FileSystem.readAsStringAsync(cacheUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (base64) return `data:image/png;base64,${base64}`;
      } catch {
        // Keep trying alternatives.
      }
    }
  }

  throw new Error("Unable to load TecMinho logo as base64.");
}

async function openGeneratedPdf(
  uri: string,
  dialogTitle: string,
): Promise<void> {
  if (!FileSystem.cacheDirectory) {
    throw new Error("A cache local da aplicação não está disponível.");
  }

  // expo-print stores the generated file under cache/Print. Copy it to the
  // app cache root so Expo Go/iOS can share it reliably. Android additionally
  // needs the resulting file converted to a content:// URI.
  const writableUri = `${FileSystem.cacheDirectory}tecminho-credential-${Date.now()}.pdf`;
  await FileSystem.copyAsync({ from: uri, to: writableUri });
  let shareUri = writableUri;
  if (Platform.OS === "android") {
    shareUri = await FileSystem.getContentUriAsync(writableUri);
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(shareUri, {
      mimeType: "application/pdf",
      dialogTitle,
      // iOS uses UTI, rather than mimeType, to identify the shared file.
      UTI: "com.adobe.pdf",
    });
    return;
  }

  if (Platform.OS === "ios") {
    throw new Error("A partilha nativa não está disponível neste Expo Go.");
  }

  // Fallback for an installed native build that does not include Expo Sharing.
  // React Native's native share sheet can still send the local PDF to Files.
  await Share.share({ url: shareUri, title: dialogTitle });
}

/**
 * Generates a PDF document from credential data and opens the sharing dialog.
 */
export async function generateAndSharePDF(
  credential: Credential | undefined,
): Promise<string | null> {
  if (!credential) {
    Alert.alert("PDF", "Não foi possível encontrar os dados da credencial.");
    return null;
  }

  try {
    if (
      credential.templateId === "tecminho-course" ||
      getCredentialTemplateId(credential) ===
        "tecminho-course"
    ) {
      let logoSrc = "";
      try {
        logoSrc = await loadTecMinhoLogoAsBase64();
      } catch {
        // Generate the certificate without a logo if the asset is unavailable.
      }
      const { uri } = await Print.printToFileAsync({
        html: buildTecMinhoCoursePdfHtml(credential, logoSrc),
        width: 595,
        height: 842,
      });

      await openGeneratedPdf(uri, "Partilhar credencial TecMinho");
      return uri;
    }

    let logoSrc = "";

    // Avoid failing PDF generation if the bundled logo cannot be read on release builds.
    try {
      logoSrc = await loadLogoAsBase64();
    } catch {
      logoSrc = "";
    }

    const { uri } = await Print.printToFileAsync({
      html: buildGenericCredentialPdfHtml(credential, logoSrc),
      width: 595, // A4 width (pt)
      height: 842, // A4 height (pt)
    });

    await openGeneratedPdf(uri, "Partilhar credencial");
    return uri;
  } catch (error) {
    console.error("Erro ao criar o PDF:", error);
    const message =
      error instanceof Error ? error.message : "Erro desconhecido ao criar o PDF.";
    Alert.alert("Não foi possível gerar o PDF", message);
    return null;
  }
}
