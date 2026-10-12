export type EnvVariable = { name: string; group: string; description: string; example: string };

/**
 * Parse .env.example into documented variables. Comment lines directly above a
 * variable (or trailing on the same line) become its description; "# --- X ---"
 * lines start a group. Commented-out variables are listed as "future".
 */
export function parseEnvExample(text: string): EnvVariable[] {
  const vars: EnvVariable[] = [];
  let group = "General";
  let pending: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const groupMatch = /^#\s*-{2,}\s*(.+?)\s*-*$/.exec(line);
    if (groupMatch?.[1]) {
      group = groupMatch[1].replace(/\s*\(.*\)\s*$/, "").trim();
      pending = [];
      continue;
    }
    const varMatch = /^(#\s*)?([A-Z][A-Z0-9_]+)=("?)(.*?)\3\s*(#\s*(.*))?$/.exec(line);
    if (varMatch?.[2]) {
      const future = Boolean(varMatch[1]);
      vars.push({
        name: varMatch[2],
        group: future ? "Future" : group,
        description: [...pending, varMatch[6] ?? ""].filter(Boolean).join(" "),
        example: varMatch[4] ?? "",
      });
      pending = [];
      continue;
    }
    if (line.startsWith("#")) {
      const comment = line.replace(/^#\s?/, "").trim();
      if (comment && !/^-+$/.test(comment)) pending.push(comment);
      continue;
    }
    if (!line) pending = [];
  }
  return vars;
}
