import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Download,
  Zap,
  Users,
  MapPin,
  TrendingUp,
  Smartphone,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { usePortalStore } from '../store/usePortalStore';
import { useTranslation } from '../utils/formatting';
import { PORTAL_CONFIG } from '../utils/constants';
import { portalApi } from '../services/portalApi';

export const PortalHome: React.FC = () => {
  const darkMode = usePortalStore((state) => state.darkMode);
  const { setLiveStats, liveStats } = usePortalStore();
  const { t } = useTranslation();
  const [counters, setCounters] = useState({ riders: 0, users: 0, cities: 0, rides: 0 });

  // Fetch live stats on mount
  useEffect(() => {
    portalApi.getLiveStats().then((stats) => {
      setLiveStats(stats);
      setCounters(stats);
    });
  }, [setLiveStats]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // ==================== HERO SECTION ====================
  const HeroSection = () => (
    <motion.section
      id="hero"
      className={`min-h-screen flex items-center justify-center px-4 py-20 ${
        darkMode ? 'bg-gradient-to-b from-gray-900 to-gray-950' : 'bg-gradient-to-b from-emerald-50 to-white'
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <motion.h1
          className={`text-5xl md:text-7xl font-black mb-6 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          {t('hero.headline')}
        </motion.h1>

        <motion.p
          className={`text-xl md:text-2xl font-bold mb-12 ${
            darkMode ? 'text-emerald-400' : 'text-emerald-600'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {t('hero.subtext')}
        </motion.p>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.a
            variants={itemVariants}
            href={PORTAL_CONFIG.DOWNLOAD_LINKS.playStoreRider}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Download size={20} />
            {t('hero.downloadRiderApp')}
          </motion.a>

          <motion.a
            variants={itemVariants}
            href={PORTAL_CONFIG.DOWNLOAD_LINKS.playStoreUser}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-14 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Download size={20} />
            {t('hero.downloadUserApp')}
          </motion.a>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`h-14 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
              darkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-emerald-400 border-2 border-emerald-400'
                : 'bg-white hover:bg-gray-50 text-emerald-600 border-2 border-emerald-600'
            }`}
          >
            <Globe size={20} />
            {t('hero.registerAsDriver')}
          </motion.button>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Smartphone size={20} />
            {t('hero.bookRide')}
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown
              size={32}
              className={darkMode ? 'text-emerald-400' : 'text-emerald-600'}
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );

  // ==================== WHAT IS SECTION ====================
  const WhatIsSection = () => (
    <motion.section
      id="what-is"
      className={`py-20 px-4 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className={`text-4xl md:text-5xl font-black text-center mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {t('whatIs.title')}
        </motion.h2>

        <motion.p
          className={`text-center text-lg mb-12 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {t('whatIs.subtitle')}
        </motion.p>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {t('whatIs.services').map((service, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              className={`p-6 rounded-2xl transition-all ${
                darkMode
                  ? 'bg-gray-800 border border-gray-700 hover:border-emerald-500'
                  : 'bg-gray-50 border border-gray-200 hover:border-emerald-500'
              } shadow-sm hover:shadow-lg`}
            >
              <div
                className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${
                  darkMode ? 'bg-emerald-900' : 'bg-emerald-100'
                }`}
              >
                <Zap className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {service.title}
              </h3>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {service.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );

  // ==================== WHY SECTION ====================
  const WhySection = () => (
    <motion.section
      id="why"
      className={`py-20 px-4 ${darkMode ? 'bg-gray-950' : 'bg-gradient-to-b from-emerald-50 to-white'}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className={`text-4xl md:text-5xl font-black text-center mb-12 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {t('why.title')}
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {t('why.benefits').map((benefit, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className={`p-6 rounded-2xl transition-all ${
                darkMode
                  ? 'bg-gradient-to-br from-emerald-900 to-gray-800 border border-emerald-700'
                  : 'bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200'
              }`}
            >
              <div className={`text-3xl font-black mb-3 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                ✓
              </div>
              <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {benefit.title}
              </h3>
              <p className={darkMode ? 'text-emerald-200' : 'text-emerald-800'}>
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );

  // ==================== LIVE COUNTERS ====================
  const LiveCountersSection = () => {
    const AnimatedCounter = ({ value, label }) => {
      const [count, setCount] = useState(0);

      useEffect(() => {
        const increment = value / 100;
        const timer = setInterval(() => {
          setCount((prev) => {
            if (prev + increment >= value) {
              clearInterval(timer);
              return value;
            }
            return prev + increment;
          });
        }, 20);
        return () => clearInterval(timer);
      }, [value]);

      return (
        <motion.div
          whileInView={{ scale: 1 }}
          initial={{ scale: 0.8 }}
          viewport={{ once: true }}
          className={`p-6 rounded-2xl text-center ${
            darkMode
              ? 'bg-gradient-to-br from-blue-900 to-gray-800 border border-blue-700'
              : 'bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200'
          }`}
        >
          <div className={`text-4xl md:text-5xl font-black mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {Math.floor(count).toLocaleString('en-IN')}+
          </div>
          <div className={`text-sm font-semibold ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
            {label}
          </div>
        </motion.div>
      );
    };

    return (
      <motion.section
        id="counters"
        className={`py-20 px-4 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className={`text-4xl md:text-5xl font-black text-center mb-12 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {t('liveCounters.title')}
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedCounter value={counters.riders} label={t('liveCounters.riders')} />
            <AnimatedCounter value={counters.users} label={t('liveCounters.users')} />
            <AnimatedCounter value={counters.cities} label={t('liveCounters.cities')} />
            <AnimatedCounter value={counters.rides} label={t('liveCounters.rides')} />
          </div>
        </div>
      </motion.section>
    );
  };

  // ==================== REGISTER CTA SECTION ====================
  const RegisterSection = () => (
    <motion.section
      id="register"
      className={`py-20 px-4 ${
        darkMode
          ? 'bg-gradient-to-r from-emerald-900 to-emerald-800'
          : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
      }`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className="text-4xl md:text-5xl font-black text-center mb-12 text-white"
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {t('register.title')}
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {[
            { type: 'user', label: t('register.userRegistration'), icon: Users },
            { type: 'rider', label: t('register.riderRegistration'), icon: MapPin },
            { type: 'business', label: t('register.businessRegistration'), icon: TrendingUp },
            { type: 'fleet', label: t('register.fleetOwnerRegistration'), icon: Globe },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.type}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-6 rounded-2xl bg-white hover:bg-gray-50 transition-all shadow-lg"
              >
                <Icon className="text-emerald-600 mb-4 mx-auto" size={32} />
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.label}</h3>
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold">
                  {t('register.registerNow')} <ArrowRight size={16} />
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );

  // ==================== DOWNLOAD SECTION ====================
  const DownloadSection = () => (
    <motion.section
      id="download"
      className={`py-20 px-4 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          className={`text-4xl md:text-5xl font-black mb-6 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {t('download.title')}
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.a
            variants={itemVariants}
            href={PORTAL_CONFIG.DOWNLOAD_LINKS.playStoreUser}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex flex-col items-center gap-2 transition-all shadow-lg"
          >
            <Download size={32} />
            {t('download.playStore')}
          </motion.a>

          <motion.a
            variants={itemVariants}
            href={PORTAL_CONFIG.DOWNLOAD_LINKS.apkUser}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-6 rounded-2xl font-bold flex flex-col items-center gap-2 transition-all ${
              darkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-emerald-400 border-2 border-emerald-400'
                : 'bg-white hover:bg-gray-50 text-emerald-600 border-2 border-emerald-600 shadow-lg'
            }`}
          >
            <Download size={32} />
            {t('download.apk')}
          </motion.a>
        </motion.div>
      </div>
    </motion.section>
  );

  // Main render
  return (
    <div>
      <HeroSection />
      <WhatIsSection />
      <WhySection />
      <LiveCountersSection />
      <RegisterSection />
      <DownloadSection />
    </div>
  );
};
