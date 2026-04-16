export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"' && inQuotes) {
      current += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}

export function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => (/[",\n]/.test(cell) ? '"' + cell.replace(/"/g, '""') + '"' : cell))
        .join(",")
    )
    .join("\n");
}
