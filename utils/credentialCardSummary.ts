type CredentialSubject = {
  achieved?:
    | {
        title?: unknown;
        wasDerivedFrom?: { grade?: unknown } | Array<{ grade?: unknown }>;
      }
    | Array<{
        title?: unknown;
        wasDerivedFrom?: { grade?: unknown } | Array<{ grade?: unknown }>;
      }>;
};

type CredentialLike = {
  credentialSubject?: CredentialSubject;
};

export type CredentialCardSummary = {
  course: string | null;
  classification: string | null;
};

function firstValue<T>(value: T | T[] | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toSummaryValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

export function getCredentialCardSummary(
  credential: CredentialLike | undefined,
): CredentialCardSummary {
  const achieved = firstValue(credential?.credentialSubject?.achieved);
  const assessment = firstValue(achieved?.wasDerivedFrom);

  return {
    course: toSummaryValue(achieved?.title),
    classification: toSummaryValue(assessment?.grade),
  };
}
