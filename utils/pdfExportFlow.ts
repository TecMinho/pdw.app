export function shouldExportAfterPreviewClose(platform: string): boolean {
  return platform !== "ios";
}