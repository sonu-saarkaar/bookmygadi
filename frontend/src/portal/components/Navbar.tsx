import { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, Globe, Moon, Sun } from 'lucide-react';
import { usePortalStore } from '../store/usePortalStore';
import { useTranslation } from '../utils/formatting';
import { PORTAL_CONFIG } from '../utils/constants';

interface NavbarProps {
  onSectionClick: (section: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSectionClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, darkMode, setDarkMode } = usePortalStore();
  const { t } = useTranslation();

  const navLinks = [
    { label: t('nav.home'), section: 'hero' },
    { label: t('nav.downloadApp'), section: 'download' },
    { label: t('nav.becomeRider'), section: 'register' },
    { label: t('nav.about'), section: 'about' },
    { label: t('nav.support'), section: 'support' },
  ];

  const handleNavClick = (section: string) => {
    onSectionClick(section);
    setIsMenuOpen(false);
    // Scroll to section with smooth behavior
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`sticky top-0 z-50 transition-colors ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
      } border-b shadow-sm`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="cursor-pointer"
            onClick={() => handleNavClick('hero')}
          >
            <div className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-emerald-600'}`}>
              📱 BookMyGadi
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <motion.button
                key={link.section}
                whileHover={{ color: '#10B981' }}
                className={`text-sm font-semibold transition-colors ${
                  darkMode
                    ? 'text-gray-300 hover:text-emerald-400'
                    : 'text-gray-700 hover:text-emerald-600'
                }`}
                onClick={() => handleNavClick(link.section)}
              >
                {link.label}
              </motion.button>
            ))}
          </div>

          {/* Right Section: Language, Theme, Menu */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={`Switch to ${language === 'en' ? 'Hindi' : 'English'}`}
            >
              <Globe size={20} />
            </motion.button>

            {/* Dark Mode Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>

            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`md:hidden pb-4 space-y-2 ${
              darkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}
          >
            {navLinks.map((link) => (
              <motion.button
                key={link.section}
                whileHover={{ x: 8 }}
                onClick={() => handleNavClick(link.section)}
                className={`w-full text-left px-4 py-2 rounded-lg font-semibold transition-colors ${
                  darkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};
