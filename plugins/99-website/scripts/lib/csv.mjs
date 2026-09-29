// Minimal RFC 4180 CSV. Quoted fields may hold commas, quotes ("") and newlines.
export function parseCsv(text) {
  text = text.replace(/^\uFEFF/, "");
  const records = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); records.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (inQuotes) throw new Error("Unterminated quoted field");
  if (field !== "" || row.length) { row.push(field); records.push(row); }
  const nonEmpty = records.filter((r) => !(r.length === 1 && r[0].trim() === ""));
  const [head = [], ...body] = nonEmpty;
  const header = head.map((h) => h.trim());
  return {
    header,
    rows: body.map((r) => Object.fromEntries(header.map((h, j) => [h, (r[j] ?? "").trim()]))),
    widths: body.map((r) => r.length),
  };
}

const quote = (v) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(header, rows) {
  return [header.map(quote).join(","), ...rows.map((r) => header.map((h) => quote(r[h])).join(","))].join("\n") + "\n";
}
