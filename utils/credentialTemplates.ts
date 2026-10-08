export const TECMINHO_ISSUER_DID =
  "did:key:z2dmzD81cgPx8Vki7JbuuMmFYrWPgYoytykUZ3eyqht1j9Kbs9v8dDVvKs3kJguUWtGDVAcBWDvCjGrj9dKhoLmvFatZFH85hxD47h9URyUca2bpaQxthTJB5bYDnswPdfSgWWXzmwrRdRryLfNyfvPzJVeepW7MJDjpALXK54rr2rRcQk";

export const TECMINHO_COURSE_TEMPLATE_ID = "tecminho-course" as const;

export type CredentialTemplateId = typeof TECMINHO_COURSE_TEMPLATE_ID;

export type CredentialIssuer = string | { id?: string };

export function getCredentialTemplateId(
  credential: { issuer?: CredentialIssuer } | undefined,
): CredentialTemplateId | null {
  const issuer =
    typeof credential?.issuer === "string"
      ? credential.issuer
      : credential?.issuer?.id;

  return issuer === TECMINHO_ISSUER_DID
    ? TECMINHO_COURSE_TEMPLATE_ID
    : null;
}
