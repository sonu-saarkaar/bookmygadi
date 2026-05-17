import { motion } from 'framer-motion';
import {
  Share2,
  Send,
  Heart,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { usePortalStore } from '../store/usePortalStore';
import { useTranslation } from '../utils/formatting';
import { PORTAL_CONFIG } from '../utils/constants';

export const Footer: React.FC = () => {
  const darkMode = usePortalStore((state) => state.darkMode);
  const { t } = useTranslation();

  const footerLinks = [
    { label: t('footer.privacy'), href: '/privacy' },
    { label: t('footer.terms'), href: '/terms' },
    { label: t('footer.refund'), href: '/refund' },
    { label: t('footer.careers'), href: '/careers' },
    { label: t('footer.support'), href: '#support' },
  ];

  const socialLinks = [
    { icon: Share2, href: PORTAL_CONFIG.SOCIAL_MEDIA.facebook, label: 'Facebook' },
    { icon: Send, href: PORTAL_CONFIG.SOCIAL_MEDIA.twitter, label: 'Twitter' },
    { icon: Heart, href: PORTAL_CONFIG.SOCIAL_MEDIA.instagram, label: 'Instagram' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <footer
      className={`${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'
      } border-t transition-colors`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8"
        >
          {/* Company Info */}
          <motion.div variants={itemVariants}>
            <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              📱 {t('nav.home')} BookMyGadi
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('hero.headline')}
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants}>
            <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('nav.home')}
            </h4>
            <ul className="space-y-2">
              {footerLinks.slice(0, 3).map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={`text-sm transition-colors ${
                      darkMode
                        ? 'text-gray-400 hover:text-emerald-400'
                        : 'text-gray-600 hover:text-emerald-600'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Support Links */}
          <motion.div variants={itemVariants}>
            <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('support.title')}
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href={`mailto:${PORTAL_CONFIG.CONTACT.email}`}
                  className={`text-sm transition-colors flex items-center gap-2 ${
                    darkMode
                      ? 'text-gray-400 hover:text-emerald-400'
                      : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  <Mail size={16} />
                  {PORTAL_CONFIG.CONTACT.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${PORTAL_CONFIG.CONTACT.phone.replace(/\s/g, '')}`}
                  className={`text-sm transition-colors flex items-center gap-2 ${
                    darkMode
                      ? 'text-gray-400 hover:text-emerald-400'
                      : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  <Phone size={16} />
                  {PORTAL_CONFIG.CONTACT.phone}
                </a>
              </li>
            </ul>
          </motion.div>

          {/* Social Media */}
          <motion.div variants={itemVariants}>
            <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('footer.followUs')}
            </h4>
            <div className="flex gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-800 text-gray-400 hover:bg-emerald-600 hover:text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-emerald-600 hover:text-white'
                    }`}
                    aria-label={social.label}
                  >
                    <Icon size={20} />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        </motion.div>

        {/* Divider */}
        <div className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'} my-8`} />

        {/* Bottom Section */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-center text-sm"
        >
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            {t('footer.copyright')}
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  darkMode
                    ? 'text-gray-400 hover:text-emerald-400'
                    : 'text-gray-600 hover:text-emerald-600'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
};
