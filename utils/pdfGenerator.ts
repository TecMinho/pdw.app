import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

interface Credential {
  id: string;
  status?: string;
  credentialSubject?: { [key: string]: any };
}

/**
 * Recursively converts credential data into HTML for PDF display
 * Handles nested objects, arrays, and primitive values with proper indentation
 */
function renderSubjectFields(data: any, level = 0): string {
  if (typeof data !== "object" || data === null) {
    return `<span class="value">${data}</span>`;
  }

  return Object.entries(data)
    .map(([key, value]) => {
      const indent = "&nbsp;".repeat(level * 4);
      const isNested = typeof value === "object" && value !== null;

      if (Array.isArray(value)) {
        const items = value.map((item) => {
          return `<div class="field">${renderSubjectFields(item, level + 1)}</div>`;
        }).join("");
        return `<div class="field"><span class="label">${indent}${key}:</span>${items}</div>`;
      }

      return `<div class="field">
                <span class="label">${indent}${key}:</span>
                ${isNested ? renderSubjectFields(value, level + 1) : `<span class="value">${value}</span>`}
              </div>`;
    })
    .join("");
}

/**
 * Generates a PDF document from credential data and opens sharing dialog
 * Creates a formatted PDF with app logo and credential information
 */
export async function generateAndSharePDF(credential: Credential | undefined): Promise<void> {
  if (!credential) return;

  try {
    const subject = credential.credentialSubject;

    const imageAsset = Asset.fromModule(require("@/assets/images/logo.png"));
    await imageAsset.downloadAsync();
    const imageBase64 = await FileSystem.readAsStringAsync(imageAsset.localUri!, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const logoSrc = `data:image/png;base64,${imageBase64}`;

    const fieldsHtml = renderSubjectFields(subject);

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body>
          <div class="logo-wrapper">
            <img src="${logoSrc}" alt="Logo" class="logo" />
          </div>
          <h1>Credential Details</h1>
          <div class="field">
            <span class="label">ID:</span>
            <span class="value">${credential.id}</span>
          </div>
          ${fieldsHtml}

          <style>
            body {
              font-family: 'Arial', sans-serif;
              padding: 40px;
              background-color: #fff;
              color: #333;
              font-size: 17px;
              text-align: left;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .logo-wrapper {
              text-align: center;
              margin-bottom: 20px;
            }
            .logo {
              width: 120px;
              height: auto;
            }
            h1 {
              color: #005BAC;
              margin-bottom: 30px;
              text-align: center;
            }
            .field {
              margin-bottom: 15px;
              max-width: 100%;
              word-break: break-word;
            }
            .label {
              font-weight: bold;
              color: #222;
              display: inline-block;
              min-width: 140px;
              vertical-align: top;
            }
            .value {
              color: #555;
              display: inline-block;
              max-width: 70%;
              word-break: break-word;
            }
          </style>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    console.log("PDF criado em:", uri);
    await Sharing.shareAsync(uri);
  } catch (error) {
    console.error("Erro ao criar o PDF:", error);
  }
}
