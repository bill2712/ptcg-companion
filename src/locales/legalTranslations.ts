import { legalPages } from './legalPages';

// Footer and menu labels for the legal pages, taken from the page titles in
// legalPages.ts so a link always reads the same as the page it opens.
export const legalDictionary: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(legalPages).map(([lang, p]) => [
    lang,
    { privacyPolicy: p.privacy.title, termsOfService: p.terms.title, contactSupport: p.contact.title },
  ]),
);
