// Site-wide settings. This is the only file you need to edit to turn on
// ads and donations. Empty strings mean "not set up yet": the matching
// feature stays hidden instead of showing a broken or fake element.

export const siteConfig = {
  name: 'PTCG Companion',

  // Public URL of the site, without a trailing slash.
  // AdSense only accepts a domain you own, so switch this to your custom
  // domain (e.g. 'https://ptcgcompanion.com') before applying.
  siteUrl: 'https://ptcg-companion.pages.dev',

  contactEmail: 'beyond01hk@gmail.com',

  // Google Analytics 4 measurement ID.
  gaId: 'G-9R61GZ220P',

  adsense: {
    // Your publisher ID, e.g. 'pub-1234567890123456'. TODO: fill in.
    publisherId: '',
    // Ad unit slot IDs from AdSense > Ads > By ad unit. Leave empty to use
    // Auto ads only.
    slots: {
      content: '', // responsive unit shown on guide and info pages
      counter: '', // banner on the match counter (only if showOnCounter)
    },
    // Ads between fast-tapped game buttons invite accidental clicks, which
    // AdSense treats as invalid traffic. Keep this off unless the slot is
    // clearly separated from the controls.
    showOnCounter: false,
  },

  donation: {
    // Fill in any you use; unused ones are hidden. TODO: fill in.
    kofi: 'https://ko-fi.com/beyond01hk',
    buyMeACoffee: '', // e.g. 'https://buymeacoffee.com/yourname'
    paypal: '', // e.g. 'https://paypal.me/yourname'
  },
} as const;

export const adsenseClient = siteConfig.adsense.publisherId
  ? `ca-${siteConfig.adsense.publisherId}`
  : '';

export const donationLinks = (
  [
    { id: 'kofi', label: 'Ko-fi', url: siteConfig.donation.kofi },
    { id: 'bmc', label: 'Buy Me a Coffee', url: siteConfig.donation.buyMeACoffee },
    { id: 'paypal', label: 'PayPal', url: siteConfig.donation.paypal },
  ] as const
).filter((d) => d.url);
