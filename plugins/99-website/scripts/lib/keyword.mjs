// Keyword matching for H1s and titles. Local keywords ("pavers charlotte nc") rarely read naturally,
// so words must appear in order, may have words between them, may be pluralised, and a trailing state is optional.
const toks = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9$]+/g, " ").trim().split(" ").filter(Boolean);
export function kwIndex(text, keyword) {
  const t = toks(text);
  let k = toks(keyword);
  const tryMatch = (kw) => {
    for (let start = 0; start < t.length; start++) {
      if (!t[start].startsWith(kw[0])) continue;
      let j = 1;
      for (let i = start + 1; i < t.length && j < kw.length; i++) if (t[i].startsWith(kw[j])) j++;
      if (j === kw.length) return t.slice(0, start).join(" ").length + (start ? 1 : 0);
    }
    return -1;
  };
  const full = tryMatch(k);
  if (full >= 0 || k.length < 2 || k[k.length - 1].length !== 2) return full;
  return tryMatch(k.slice(0, -1));
}
