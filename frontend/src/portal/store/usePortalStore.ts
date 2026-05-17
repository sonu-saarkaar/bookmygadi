import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RegistrationType = 'user' | 'rider' | 'business' | 'fleet' | null;

interface PortalState {
  language: 'en' | 'hi';
  darkMode: boolean;
  activeSection: string;
  showRegistrationModal: boolean;
  registrationType: RegistrationType;
  formErrors: Record<string, string>;
  isSubmitting: boolean;
  liveStats: {
    riders: number;
    users: number;
    cities: number;
    rides: number;
  };
  setLanguage: (lang: 'en' | 'hi') => void;
  setDarkMode: (mode: boolean) => void;
  setActiveSection: (section: string) => void;
  openRegistrationModal: (type: RegistrationType) => void;
  closeRegistrationModal: () => void;
  setFormErrors: (errors: Record<string, string>) => void;
  setIsSubmitting: (state: boolean) => void;
  setLiveStats: (stats: PortalState['liveStats']) => void;
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set) => ({
      language: 'en',
      darkMode: false,
      activeSection: 'hero',
      showRegistrationModal: false,
      registrationType: null,
      formErrors: {},
      isSubmitting: false,
      liveStats: {
        riders: 0,
        users: 0,
        cities: 0,
        rides: 0,
      },
      setLanguage: (lang) => set({ language: lang }),
      setDarkMode: (mode) => set({ darkMode: mode }),
      setActiveSection: (section) => set({ activeSection: section }),
      openRegistrationModal: (type) =>
        set({ showRegistrationModal: true, registrationType: type }),
      closeRegistrationModal: () =>
        set({ showRegistrationModal: false, registrationType: null }),
      setFormErrors: (errors) => set({ formErrors: errors }),
      setIsSubmitting: (state) => set({ isSubmitting: state }),
      setLiveStats: (stats) => set({ liveStats: stats }),
    }),
    {
      name: 'bmg_portal_store',
      partialize: (state) => ({
        language: state.language,
        darkMode: state.darkMode,
      }),
    }
  )
);
