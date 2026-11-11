// Pricing is the store's job once this ships: App Store Connect and Play Console
// hold a price per territory, and the billing layer reports what the account will
// actually be charged in its own currency. This module is two things only — the
// fallback the web build renders, and the source of truth for the numbers to type
// into each console. Never show a converted price; show the store's own.

const NG = {
  code: 'NG', cur: 'NGN', locale: 'en-NG',
  // A naira ladder, not a dollar conversion. At ~₦1,347/$ the global price would
  // land at ₦67,000 a year, which is not a price in this market, it is a wall.
  // The anchors Nigerians actually price music against: Spotify Individual is
  // ₦1,600 a month, education apps on the Nigerian App Store sit at ₦2,900–5,400.
  // Yearly works out to ₦1,658 a month, level with Spotify. All three amounts use
  // Apple's X,900 convention for NGN so they can be entered as-is.
  plans: [
    { id: 'year',  name: 'Yearly',  amount: 19900, per: 'a year',  note: '₦1,658 a month, save 43%', tag: 'BEST VALUE', trial: 7 },
    { id: 'month', name: 'Monthly', amount: 2900,  per: 'a month' },
    { id: 'week',  name: 'Weekly',  amount: 900,   per: 'a week',  note: 'Pay as you go, like a data bundle' }
  ],
  // An hour with a vocal coach in Lagos starts around ₦5,000 (Superprof's Lagos
  // average is ₦3,496–4,138; most UpSkillsTutor listings are ₦5,000 and up).
  // A year of Pro is under four of them.
  worth: 'An hour with a vocal coach in Lagos starts around ₦5,000. A year of this is under four of them.',
  pay: 'Google Play takes Verve cards and MTN airtime, so a naira card that fails on foreign charges still works.'
};

const WORLD = {
  code: 'ZZ', cur: 'USD', locale: 'en-US',
  plans: [
    { id: 'year',  name: 'Yearly',  amount: 49.99, per: 'a year',  note: '$4.17 a month, save 48%', tag: 'BEST VALUE', trial: 7 },
    { id: 'month', name: 'Monthly', amount: 7.99,  per: 'a month' }
  ],
  worth: 'A single lesson with a vocal coach costs more than a year of this.'
};

const TABLE = { NG, ZZ: WORLD };

// The store knows the country for certain. Everything below it is a guess, so it
// only ever decides which prices to *show* — entitlement and the charge itself
// always come from the store.
function guess(){
  const q = new URLSearchParams(location.search).get('region');
  if (q && TABLE[q.toUpperCase()]) return q.toUpperCase();
  try {
    if (window.PitchPassBilling?.country) return window.PitchPassBilling.country;
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Africa/Lagos') return 'NG';
    if (/-NG$/i.test(navigator.language || '')) return 'NG';
  } catch (e) {}
  return 'ZZ';
}

export const region = TABLE[guess()] || WORLD;

export function money(amount, r = region){
  return new Intl.NumberFormat(r.locale, {
    style: 'currency', currency: r.cur,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2
  }).format(amount);
}

export const planById = id => region.plans.find(p => p.id === id) || region.plans[0];
