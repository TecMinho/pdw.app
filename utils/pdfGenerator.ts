import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";

interface Credential {
  id: string;
  status?: string;
  credentialSubject?: { [key: string]: any };
}

/**
 * Safely renders any credential field to HTML.
 */
function renderSubjectFields(data: any, level = 0): string {
  if (typeof data !== "object" || data === null) {
    return `<span class="value">${String(data)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</span>`;
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
                    : `<span class="value">${String(value)
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")}</span>`
                }
              </div>`;
    })
    .join("");
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

/**
 * Generates a PDF document from credential data and opens the sharing dialog.
 */
export async function generateAndSharePDF(
  credential: Credential | undefined,
): Promise<void> {
  if (!credential) return;

  try {
    const subject = credential.credentialSubject ?? {};
    const fieldsHtml = renderSubjectFields(subject);
    let logoSrc = "";

    // Avoid failing PDF generation if the bundled logo cannot be read on release builds.
    try {
      logoSrc = await loadLogoAsBase64();
    } catch {
      logoSrc = "";
    }

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
          />
        </head>
        <body>
          ${
            logoSrc
              ? `<div class="logo-wrapper">
                   <img src="${logoSrc}" alt="Logo" class="logo" />
                 </div>`
              : ""
          }

          <h1>Credential Details</h1>

          <div class="field">
            <span class="label">ID:</span>
            <span class="value">${String(credential.id)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</span>
          </div>

          ${fieldsHtml}

          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
              padding: 40px 32px;
              background-color: #ffffff;
              color: #333333;
              font-size: 14px;
              line-height: 1.6;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }

            .logo-wrapper {
              text-align: center;
              margin-bottom: 24px;
            }

            .logo {
              width: 120px;
              height: auto;
              max-width: 100%;
            }

            h1 {
              color: #005BAC;
              margin-bottom: 24px;
              text-align: center;
              font-size: 22px;
              font-weight: 600;
            }

            .field {
              margin-bottom: 12px;
              page-break-inside: avoid;
              max-width: 100%;
            }

            .label {
              font-weight: 600;
              color: #222222;
              display: inline-block;
              min-width: 140px;
              vertical-align: top;
            }

            .value {
              color: #555555;
              display: inline-block;
              max-width: 70%;
              word-break: break-word;
            }

            @media print {
              body {
                padding: 24px;
              }
            }
          </style>
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      width: 595, // A4 width (pt)
      height: 842, // A4 height (pt)
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Compartilhar credencial",
      });
    }
  } catch (error) {
    throw error;
  }
}
