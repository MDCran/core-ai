const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
const ROLE_MARKERS = /\b(system|assistant|developer|user|tool|model|human)\s*:/gi;
const DELIMITER_RUNS = /([=`~#*_<>-]){3,}/g;
const INSTRUCTION_TAGS = /[<[]\s*\/?\s*(system|instructions?|developer|assistant|user|tool|prompt)\s*[>\]]/gi;

/**
 * Produces display-safe text for a prompt data field. Callers must still label
 * the result as data and never execute instructions embedded in user content.
 */
export function isolateUntrustedText(value: string | null | undefined, maxLength = 12_000): string {
  if (!value) return "";

  const normalized = value.normalize("NFKC")
    .replace(CONTROL_CHARACTERS, "")
    .replace(/<\|/g, "(|")
    .replace(/\|>/g, "|)")
    .replace(ROLE_MARKERS, "$1 -")
    .replace(INSTRUCTION_TAGS, "($1)")
    .replace(DELIMITER_RUNS, (run) => run.slice(0, 2));

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized.trim();
}
