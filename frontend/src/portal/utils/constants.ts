// Portal configuration and constants

export const PORTAL_CONFIG = {
  SITE_NAME: 'BookMyGadi',
  SITE_DESCRIPTION: "Bihar ka apna mobility platform - Ride, Earn, Reserve, Grow",
  SITE_URL: 'https://web.bookmygadi.app',
  API_BASE_URL: process.env.VITE_API_URL || 'http://localhost:8000',

  // SEO
  SEO: {
    title: "Bihar ka apna mobility platform | BookMyGadi",
    description: "Book rides, earn as a driver, reserve vehicles. Download BookMyGadi - Bihar's #1 ride-hailing platform.",
    keywords: "Bihar ride booking, Champaran taxi, Book car Bihar, Driver registration Bihar, Ride sharing",
    author: "BookMyGadi",
    image: "/og-image.png",
  },

  // App Download Links
  DOWNLOAD_LINKS: {
    playStoreUser: 'https://play.google.com/store/apps/details?id=com.bookmygadi.user',
    playStoreRider: 'https://play.google.com/store/apps/details?id=com.bookmygadi.rider',
    apkUser: '/apk/bookmygadi-user.apk',
    apkRider: '/apk/bookmygadi-rider.apk',
  },

  // Social Media
  SOCIAL_MEDIA: {
    whatsapp: 'https://wa.me/919876543210',
    facebook: 'https://facebook.com/bookmygadi',
    twitter: 'https://twitter.com/bookmygadi',
    instagram: 'https://instagram.com/bookmygadi',
    youtube: 'https://youtube.com/bookmygadi',
  },

  // Contact Info
  CONTACT: {
    email: 'support@bookmygadi.app',
    phone: '+91 987-654-3210',
    whatsapp: '+91 987-654-3210',
  },

  // Routes
  ROUTES: {
    home: '/',
    about: '/#about',
    support: '/#support',
    register: '/#register',
  },

  // Sections
  SECTIONS: {
    hero: 'hero',
    what_is: 'what-is',
    why: 'why',
    earnings: 'earnings',
    showcase: 'showcase',
    download: 'download',
    register: 'register',
    counters: 'counters',
    about: 'about',
    support: 'support',
  },

  // Theme Colors
  THEME: {
    primary: '#10B981', // emerald-500
    primaryDark: '#059669', // emerald-600
    secondary: '#3B82F6', // blue-500
    danger: '#EF4444', // red-500
    warning: '#F59E0B', // amber-500
    success: '#10B981', // emerald-500
    light: '#F3F4F6', // gray-100
    dark: '#111827', // gray-900
  },

  // Animation Defaults
  ANIMATION: {
    staggerDelay: 0.1,
    entryDuration: 0.5,
    springConfig: {
      type: 'spring',
      damping: 28,
      stiffness: 220,
      mass: 0.8,
    },
  },

  // Earnings Examples (for display)
  EARNINGS_EXAMPLES: {
    auto: {
      daily: '₹800 - ₹1200',
      monthly: '₹24,000 - ₹36,000',
    },
    bike: {
      daily: '₹600 - ₹1000',
      monthly: '₹18,000 - ₹30,000',
    },
    car: {
      daily: '₹1500 - ₹2500',
      monthly: '₹45,000 - ₹75,000',
    },
    lorry: {
      daily: '₹2000 - ₹3500',
      monthly: '₹60,000 - ₹105,000',
    },
  },

  // FAQ Items
  FAQ: [
    {
      id: 1,
      question: 'How do I register as a rider?',
      answer: 'Visit our website, click "Become Rider", fill in your details, submit documents, and start earning after approval.',
    },
    {
      id: 2,
      question: 'What documents do I need?',
      answer: 'You need: Valid Driving License, Vehicle RC, Insurance, Pollution Certificate, and Aadhaar.',
    },
    {
      id: 3,
      question: 'How do I get paid?',
      answer: 'Payments are transferred to your bank account daily or weekly, depending on your preference.',
    },
    {
      id: 4,
      question: 'Is there a registration fee?',
      answer: 'No, registration is completely free. We only take a small commission on each ride.',
    },
    {
      id: 5,
      question: 'How do I book a ride?',
      answer: 'Download our user app, enter your pickup and drop location, and book your ride in seconds.',
    },
    {
      id: 6,
      question: 'What areas do you serve?',
      answer: 'We currently serve all major cities in Bihar. Check our app for availability in your area.',
    },
  ],
};
