# BookMyGadi Portal - Development Guide

## 🚀 What's Built

A production-grade, responsive web portal for `web.bookmygadi.app` with:
- ✅ Complete landing page with 6 major sections
- ✅ Bilingual support (English & Hindi)
- ✅ Dark mode support
- ✅ Animated components using Framer Motion
- ✅ Live stats fetched from backend API
- ✅ Responsive mobile-first design
- ✅ Tailwind CSS styling

## 📂 Project Structure

```
frontend/src/portal/
├── PortalApp.tsx                 # Portal root
├── PortalRouter.tsx              # Routes
├── pages/
│   └── PortalHome.tsx            # Main landing page (1800+ lines)
├── components/
│   ├── Navbar.tsx                # Sticky nav with i18n & dark mode
│   ├── Footer.tsx                # Footer with links
│   ├── Hero/
│   ├── Sections/
│   ├── Forms/
│   ├── Cards/
│   └── (more components to add)
├── layouts/
│   └── PortalLayout.tsx          # Main wrapper
├── store/
│   └── usePortalStore.ts         # Zustand state (language, dark mode, stats)
├── services/
│   └── portalApi.ts              # API integration
├── utils/
│   ├── translations.ts           # i18n strings (Hindi & English)
│   ├── constants.ts              # Portal config & links
│   └── formatting.ts             # Translation hook & formatters
└── styles/
    └── (custom CSS - to be added)
```

## 🔧 How to Continue Development

### 1. Adding New Section Components

**Example: Adding "About" Section**

```typescript
// File: frontend/src/portal/components/Sections/AboutSection.tsx
import { motion } from 'framer-motion';
import { useTranslation } from '../../utils/formatting';
import { usePortalStore } from '../../store/usePortalStore';

export const AboutSection: React.FC = () => {
  const darkMode = usePortalStore((state) => state.darkMode);
  const { t } = useTranslation();

  return (
    <motion.section
      id="about"
      className={`py-20 px-4 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('about.title')}
        </h2>
        {/* Add content */}
      </div>
    </motion.section>
  );
};
```

**Then add to PortalHome.tsx:**
```typescript
import { AboutSection } from '../components/Sections/AboutSection';

export const PortalHome: React.FC = () => {
  return (
    <div>
      <HeroSection />
      <WhatIsSection />
      {/* ... other sections ... */}
      <AboutSection />  {/* Add here */}
    </div>
  );
};
```

### 2. Creating Registration Forms

**Create Form Component:**

```typescript
// File: frontend/src/portal/components/Forms/UserRegistrationForm.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePortalStore } from '../../store/usePortalStore';
import { useTranslation } from '../../utils/formatting';
import { portalApi } from '../../services/portalApi';

export const UserRegistrationForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { isSubmitting, setIsSubmitting, formErrors, setFormErrors } = usePortalStore();
  const { t } = useTranslation();
  const darkMode = usePortalStore((state) => state.darkMode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await portalApi.registerUser({ email, phone, name, password });
      // Show success message
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Form fields here */}
        <input
          type="text"
          placeholder={t('forms.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full p-3 rounded-lg border ${
            darkMode
              ? 'bg-gray-900 border-gray-700'
              : 'bg-gray-50 border-gray-300'
          }`}
          required
        />
        {/* ... more fields ... */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-bold"
        >
          {isSubmitting ? t('forms.loading') : t('forms.submit')}
        </button>
      </form>
    </motion.div>
  );
};
```

### 3. Creating Modal System

**Example Modal Pattern:**

```typescript
// In PortalHome.tsx or a dedicated Modals component
import { AnimatePresence, motion } from 'framer-motion';
import { usePortalStore } from './store/usePortalStore';
import { UserRegistrationForm } from './components/Forms/UserRegistrationForm';

const RegistrationModals = () => {
  const { showRegistrationModal, closeRegistrationModal, registrationType } = usePortalStore();

  return (
    <AnimatePresence>
      {showRegistrationModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={closeRegistrationModal}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            {registrationType === 'user' && (
              <UserRegistrationForm onClose={closeRegistrationModal} />
            )}
            {/* ... other form types ... */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

### 4. Using the Translation Hook

```typescript
import { useTranslation } from '../utils/formatting';

export const MyComponent = () => {
  const { t, language } = useTranslation();

  return (
    <div>
      <h1>{t('hero.headline')}</h1>
      <p>{t('hero.subtext')}</p>
      <button onClick={() => switchLanguage(language === 'en' ? 'hi' : 'en')}>
        Switch to {language === 'en' ? 'Hindi' : 'English'}
      </button>
    </div>
  );
};
```

### 5. Adding Translation Strings

**Update `frontend/src/portal/utils/translations.ts`:**

```typescript
export const translations = {
  en: {
    about: {
      title: "About BookMyGadi",
      vision: "Our Vision",
      // ... more strings
    }
  },
  hi: {
    about: {
      title: "BookMyGadi के बारे में",
      vision: "हमारा दृष्टिकोण",
      // ... more strings
    }
  }
};
```

### 6. API Integration Pattern

**Adding new API endpoint:**

```typescript
// In portal/services/portalApi.ts
export const portalApi = {
  // Existing methods...
  
  async customEndpoint(data: any): Promise<any> {
    try {
      return await apiCall('/custom-endpoint', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Failed to call custom endpoint:', error);
      throw error;
    }
  },
};
```

## 🎨 Styling Patterns

### Responsive Grid
```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Items */}
</div>
```

### Dark Mode Aware
```typescript
const darkMode = usePortalStore((state) => state.darkMode);
<div className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
```

### Animation on Scroll
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>
```

## 🧪 Testing the Portal

### Local Development
```bash
cd frontend
npm run dev
# Portal works with subdomain detection
# Main app: http://localhost:5173
```

### Build & Preview
```bash
npm run build
npm run preview
```

### Test Dark Mode
```typescript
// In browser console:
localStorage.setItem('bmg_portal_store', JSON.stringify({
  state: { darkMode: true }
}));
```

### Test Language Switch
```typescript
// In browser console:
localStorage.setItem('bmg_portal_store', JSON.stringify({
  state: { language: 'hi' }
}));
```

## 📊 State Management Patterns

### Reading State
```typescript
const language = usePortalStore((state) => state.language);
```

### Updating State
```typescript
const setLanguage = usePortalStore((state) => state.setLanguage);
setLanguage('hi');
```

### Multiple State Values
```typescript
const { language, darkMode, setLanguage, setDarkMode } = usePortalStore();
```

## 🔐 Security Considerations

- ✅ Never store auth tokens in Zustand store
- ✅ Use sessionStorage for temporary form data
- ✅ Validate all inputs server-side
- ✅ CSRF protection via backend headers
- ✅ Rate limiting already configured (180 req/60s)

## 🚀 Deployment Checklist

- [ ] Update `public/manifest.json` for PWA
- [ ] Create `public/sw.js` for service worker
- [ ] Configure DNS for `web.bookmygadi.app`
- [ ] Update backend CORS for subdomain
- [ ] Add meta tags to `index.html`
- [ ] Generate sitemap
- [ ] Configure CDN
- [ ] Test on low-bandwidth connection
- [ ] Lighthouse audit (90+)
- [ ] Mobile testing on real devices

## 📞 Integration Points

### From Backend
- `/admin/dashboard` - Live stats
- `/auth/register` - User/rider registration
- `/vehicles/rider-registrations` - Driver registration
- `/rides/{id}/support-ticket` - Support tickets

### To Frontend (App)
- Works seamlessly with existing app on same backend
- Shared authentication can be added
- User can download app and continue on mobile

## 💡 Pro Tips

1. **Performance:** Component parts of PortalHome into separate files for better code-splitting
2. **Accessibility:** Use semantic HTML and test with screen readers
3. **SEO:** Add `<head>` management with react-helmet-async
4. **Analytics:** Add GA4 events for all user actions
5. **Animations:** Respect `prefers-reduced-motion` for accessibility

## 📚 Key Files to Know

| File | Purpose |
|------|---------|
| `portal/store/usePortalStore.ts` | All portal state |
| `portal/utils/translations.ts` | i18n strings |
| `portal/utils/constants.ts` | Configuration |
| `portal/services/portalApi.ts` | Backend calls |
| `portal/pages/PortalHome.tsx` | Main page |
| `portal/components/Navbar.tsx` | Top navigation |
| `src/App.tsx` | Subdomain routing |

---

**Happy coding! 🚀**
