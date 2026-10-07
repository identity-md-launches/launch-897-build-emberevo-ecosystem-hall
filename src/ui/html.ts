export class Markup { constructor(public value: string) {} }
export const escapeText = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
// Only application-authored template segments are trusted. Every research value is escaped.
export function html(strings: TemplateStringsArray, ...values: unknown[]): Markup {
  const render = (v: unknown): string => v instanceof Markup ? v.value : Array.isArray(v) ? v.map(render).join('') : escapeText(v);
  return new Markup(strings.reduce((s, part, i) => s + part + (i < values.length ? render(values[i]) : ''), ''));
}
export const empty = html``;
export function sourceLink(url: string, label: string) {
  try { const u = new URL(url); if (u.protocol !== 'https:' || u.username || u.password) return html`<span>來源連結無效</span>`;
    return html`<a class="source-link" href="${u.href}" target="_blank" rel="noopener noreferrer">${label} ↗ <span>${u.hostname}${u.pathname}</span></a>`;
  } catch { return html`<span>來源連結無效</span>`; }
}
