export const founderEnvKeys = [
  "FOUNDER_ACCESS_USERNAME",
  "FOUNDER_ACCESS_DISPLAY_NAME",
  "FOUNDER_ACCESS_PHRASE",
] as const;

export type FounderAccessKey = (typeof founderEnvKeys)[number];

type FounderAccessStatus = {
  key: FounderAccessKey;
  length: number;
  nonEmpty: boolean;
  present: boolean;
  trimmedEmpty: boolean;
};

export function getFounderAccessConfig() {
  const status = founderEnvKeys.map((key) => {
    const rawValue = process.env[key];
    const trimmedValue = rawValue?.trim() ?? "";

    return {
      key,
      length: typeof rawValue === "string" ? rawValue.length : 0,
      nonEmpty: trimmedValue.length > 0,
      present: typeof rawValue === "string",
      trimmedEmpty: trimmedValue.length === 0,
      value: trimmedValue,
    };
  });

  const missing = status
    .filter((entry) => !entry.present)
    .map((entry) => entry.key);
  const blank = status
    .filter((entry) => entry.present && !entry.nonEmpty)
    .map((entry) => entry.key);
  const [username, displayName, founderPhrase] = status.map(
    (entry) => entry.value,
  );
  const safeStatus: FounderAccessStatus[] = status.map(
    ({ key, length, nonEmpty, present, trimmedEmpty }) => ({
      key,
      length,
      nonEmpty,
      present,
      trimmedEmpty,
    }),
  );

  if (missing.length > 0 || blank.length > 0) {
    return {
      blank,
      config: null,
      missing,
      status: safeStatus,
    };
  }

  return {
    blank,
    config: { displayName, founderPhrase, username },
    missing,
    status: safeStatus,
  };
}
