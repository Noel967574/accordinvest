import { getContent, setContent } from './db.js';

// Placeholder copy — edit every field through /admin instead of touching this file.
const seed = {
  branding: {
    siteName: 'Accord Capital Investments',
    tagline: 'Invest with clarity',
    supportEmail: 'support@example.com',
    supportPhone: '+1 000 000 0000',
    address: 'Street address, City, Country',
    primaryColor: '#6e00ff',
    footerNote: '© Accord Capital Investments. All rights reserved.'
  },
  nav: {
    links: [
      { label: 'Home', href: '/' },
      { label: 'FAQ', href: '/faq' }
    ],
    ctaPrimary: 'Login',
    ctaSecondary: 'Get started'
  },
  hero: {
    eyebrow: 'Invest with clarity',
    heading: 'Build a portfolio that lasts',
    subheading: 'Explore investment opportunities, compare their terms, and manage your portfolio with clear information and dedicated account support.',
    primaryCta: 'Explore plans',
    secondaryCta: 'Sign in',
    statLabels: ['Assets managed', 'Active clients', 'Countries'],
    statValues: ['$00.0M', '0,000', '00']
  },
  security: {
    heading: 'Your account and information, handled with care',
    intro: 'Secure sign-in practices and careful access controls help safeguard your account and personal information.',
    items: [
      {
        title: 'Secure account access',
        body: 'Passwords are securely hashed, and sign-in sessions use private, server-managed cookies.'
      },
      {
        title: 'Privacy-conscious data handling',
        body: 'Access controls help keep your personal details and account activity private.'
      }
    ]
  },
  features: {
    heading: 'Tools to manage your investments',
    intro: 'Review your account, compare available plans, and keep track of your investment activity in one place.',
    items: [
      {
        title: 'A clear portfolio overview',
        body: 'Review your available balance, active plans, returns, and recent account activity from your dashboard.'
      },
      {
        title: 'Investment plans at a glance',
        body: 'Compare available plan amounts, terms, and potential returns before choosing an option.'
      },
      {
        title: 'Track account activity',
        body: 'Check the status of deposits, withdrawals, and investment requests in your transaction history.'
      }
    ]
  },
  plans: {
    heading: 'Investment opportunities',
    intro: 'Explore structured investment plans designed for different objectives, time horizons, and risk preferences.',
    cards: [
      {
        name: 'Starter',
        price: '$500',
        period: '1 week',
        blurb: 'For first-time investors.',
        perks: ['Min. Possible deposit: $499', 'Max. Possible deposit: $500', '$250 Minimum return', '$500 Maximum return', '$50 Gift Bonus'],
        featured: false
      },
      {
        name: 'Basic',
        price: '$1000',
        period: '1 week',
        blurb: 'For steady capital growth.',
        perks: ['Min. Possible deposit: $999', 'Max. Possible deposit: $1000', '$250 Minimum return', '$500 Maximum return', '$100 Gift Bonus'],
        featured: true
      },
      {
        name: 'PRO',
        price: '$5000',
        period: '1 week',
        blurb: 'For high-conviction investors.',
        perks: ['Min. Possible deposit: $4999', 'Max. Possible deposit: $5000', '$250 Minimum return', '$500 Maximum return', '$100 Gift Bonus'],
        featured: false
      }
    ]
  },
  testimonials: {
    heading: 'An investment experience built around clarity',
    intro: 'Explore plan details, follow your account activity, and find help through the platform when you need it.',
    items: [
      {
        title: 'Know the plan details',
        body: 'Review the stated amount, term, and potential return for a plan before you decide whether it suits your goals.'
      },
      {
        title: 'Keep track of your activity',
        body: 'Use your account dashboard and transaction history to review balances, investments, and request statuses.'
      },
      {
        title: 'Support information',
        body: 'Check the support details in the footer if you have questions about your account or available plans.'
      }
    ]
  },
  faq: {
    heading: 'Investment FAQs',
    items: [
      {
        q: 'How do I choose an investment plan?',
        a: 'Compare each available plan’s minimum and maximum amount, term, and stated return. Review the plan details and make sure the amount and terms suit your goals before investing.'
      },
      {
        q: 'Are returns guaranteed?',
        a: 'No investment return should be treated as guaranteed. Any return shown is based on the plan information provided and may be subject to the plan terms and investment risks. Read the applicable terms carefully before committing funds.'
      },
      {
        q: 'How do I start an investment?',
        a: 'Create an account, sign in, and open Investment plans from your dashboard. Choose an available plan, enter an amount within its limits, and follow the payment or balance instructions.'
      },
      {
        q: 'How long does an investment run?',
        a: 'The term depends on the plan you select. Your plan details show the term, and active investments are listed in your account dashboard with their maturity date.'
      },
      {
        q: 'How do deposits and withdrawals work?',
        a: 'Submit a deposit or withdrawal request from your account. Requests are marked pending until they have been reviewed; you can check their status in your transaction history.'
      },
      {
        q: 'Where can I see my investments and transactions?',
        a: 'Sign in and visit your dashboard to review your balance and active plans. Open History to see deposits, withdrawals, and other account activity.'
      }
    ]
  },
  about: {
    heading: 'About us',
    paragraphs: ['First paragraph of your story.', 'Second paragraph about your approach.'],
    values: [
      { title: 'Value one', body: 'Sentence.' },
      { title: 'Value two', body: 'Sentence.' }
    ]
  },
  contact: {
    heading: 'Contact',
    intro: 'Send us a message and we will reply.',
    successMessage: 'Thanks — your message has been received.'
  },
  payment: {
    cryptoNetwork: 'Bitcoin (BTC)',
    cryptoAddress: 'bc1qvvzw4e5dtu0gl4eva8yypy0yphqfddn673v2yj',
    cryptoInstructions: 'Send only BTC to the wallet below, then paste your transaction hash for confirmation.',
    bankName: 'Your bank name',
    accountName: 'Your company name',
    accountNumber: 'Account number / IBAN',
    swift: 'SWIFT / BIC',
    bankInstructions: 'Include your registered email as the transfer reference so we can match your payment.',
    cardNote: 'Test mode — simulated payment, no real money moves.',
    paymentApps: [
      { name: 'Paystack', handle: 'Your Paystack business email or ID', note: 'Pay in the app, then paste the payment reference it shows.' },
      { name: 'Flutterwave', handle: 'Your Flutterwave account', note: 'Pay in the app, then paste the transaction reference it shows.' }
    ]
  }
};

export function seedContent(force = false) {
  for (const [key, body] of Object.entries(seed)) {
    if (force || !getContent(key)) setContent(key, body);
  }
  // Databases seeded before payment apps existed: add the list without touching edits.
  const payment = getContent('payment');
  if (payment && !Array.isArray(payment.paymentApps)) {
    setContent('payment', { ...payment, paymentApps: seed.payment.paymentApps });
  }
}
