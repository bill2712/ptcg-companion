// Tiny markup for translated legal copy, so links and code can sit anywhere in a
// sentence whatever the word order of the language:
//   `code`         -> <code>
//   [label](key)   -> link to links[key] (external links open in a new tab)
//   {email}        -> mailto link to the contact address
// An unknown link key fails the build instead of shipping a broken link.

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const linkClass = 'text-accent hover:underline';

export function richText(text: string, links: Record<string, string>, email: string): string {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-surface-2 text-fg text-[13px]">$1</code>')
    .replace(/\[([^\]]+)\]\(([A-Za-z]+)\)/g, (_, label: string, key: string) => {
      const href = links[key];
      if (!href) throw new Error(`richText: unknown link key "${key}" in "${text}"`);
      const external = /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${esc(href)}" class="${linkClass}"${external}>${label}</a>`;
    })
    .replace(/\{email\}/g, `<a href="mailto:${esc(email)}" class="${linkClass}">${esc(email)}</a>`);
}

/** The same text with the markup removed, for meta descriptions. */
export const plainText = (text: string, email: string) =>
  text.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([A-Za-z]+\)/g, '$1').replace(/\{email\}/g, email);
