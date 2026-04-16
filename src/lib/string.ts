export function capitalize(str: string): string {
  return str.length === 0 ? str : str[0].toUpperCase() + str.slice(1);
}

export function toTitleCase(str: string): string {
  return str.split(/\s+/).map(capitalize).join(" ");
}

export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_-](.)/g, (_, c) => c.toUpperCase());
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

export function toSnakeCase(str: string): string {
  return toKebabCase(str).replace(/-/g, "_");
}

export function reverseString(str: string): string {
  return str.split("").reverse().join("");
}

export function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
}
