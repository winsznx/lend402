const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}
