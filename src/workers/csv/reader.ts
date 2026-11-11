/**
 * Dependency-free CSV reader (RFC 4180): quotes, escaped double quotes ("") and line breaks inside
 * a quoted field. It is a generator: it yields row by row so the caller can report progress without
 * waiting for the whole file.
 */
export function detectDelimiter(firstLine: string): "," | ";" {
  const count = (c: string) => firstLine.split(c).length - 1;
  return count(";") > count(",") ? ";" : ",";
}

/** Decode as UTF-8 and, when that is not valid, as Windows-1252 (Spanish Excel saves as «ANSI»). */
export function decode(bytes: ArrayBuffer): { text: string; encoding: string } {
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, ""), encoding: "UTF-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "Windows-1252 (ANSI)" };
  }
}

export function* csvRows(text: string, delimiter: string): Generator<{ fields: string[]; end: number }> {
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim() !== "")) yield { fields: row, end: i + 1 };
      row = []; field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) yield { fields: row, end: text.length };
}

/** Escape a value to write it back as CSV. */
export const cell = (v: string) => (/[",;\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
