import { usePortalStore } from '../store/usePortalStore';
import { translations } from './translations';

export function useTranslation() {
  const language = usePortalStore((state) => state.language);

  const t = (key: string): string => {
    const parts = key.split('.');
    let value: any = translations[language as keyof typeof translations];

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    return String(value);
  };

  return { t, language };
}

// Formatting utilities
export const formatters = {
  formatNumber: (num: number, lang: 'en' | 'hi' = 'en'): string => {
    if (lang === 'hi') {
      return num.toLocaleString('hi-IN');
    }
    return num.toLocaleString('en-IN');
  },

  formatCurrency: (amount: number, lang: 'en' | 'hi' = 'en'): string => {
    const formatted = lang === 'hi'
      ? new Intl.NumberFormat('hi-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
        }).format(amount)
      : new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
        }).format(amount);
    return formatted;
  },

  formatPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return phone;
  },

  formatEmail: (email: string): string => {
    return email.toLowerCase().trim();
  },
};
