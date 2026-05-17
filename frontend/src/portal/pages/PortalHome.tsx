import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Download, Zap, Check, MapPin, TrendingUp, Smartphone, ChevronDown } from 'lucide-react';
import { usePortalStore } from '../store/usePortalStore';
import { useTranslation } from '../utils/formatting';
import { PORTAL_CONFIG } from '../utils/constants';
import { portalApi } from '../services/portalApi';

export const PortalHome: React.FC = () => {
  const darkMode = usePortalStore((state) => state.darkMode);
  const { setLiveStats } = usePortalStore();
  const { t } = useTranslation();
  const [counters, setCounters] = useState({ riders: 0, users: 0, cities: 0, rides: 0 });

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
        darkMode ? 'bg-gradient-to-b from-gray-900 via-emerald-900 to-gray-950' : 'bg-gradient-to-b from-emerald-50 via-emerald-100 to-white'
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-5xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`inline-block mb-6 px-4 py-2 rounded-full text-sm font-bold ${
            darkMode ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-200 text-emerald-800'
          }`}
        >
          🇮🇳 Bihar का पहला Ride App
        </motion.div>

        {/* Headline */}
        <motion.h1
          className={`text-6xl md:text-7xl font-black mb-4 leading-tight ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          {t('hero.headline')}
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className={`text-2xl md:text-3xl font-black mb-2 ${
            darkMode ? 'text-emerald-400' : 'text-emerald-600'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {t('hero.tagline')}
        </motion.p>

        {/* Subtitle */}
        <motion.p
          className={`text-xl md:text-2xl font-bold mb-12 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {t('hero.subtitle')}
        </motion.p>

        {/* Description */}
        <motion.p
          className={`text-lg mb-12 max-w-3xl mx-auto ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          {t('hero.description')}
        </motion.p>

        {/* CTA Buttons - Grid for better layout */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Instant Ride - Primary CTA */}
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-16 md:h-20 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-2xl"
          >
            <Zap size={28} />
            {t('cta.instantRide')}
          </motion.button>

          {/* Reserve Ride - Secondary CTA */}
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-16 md:h-20 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-2xl"
          >
            <MapPin size={28} />
            {t('cta.reserveRide')}
          </motion.button>

          {/* Become Rider */}
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`h-16 md:h-20 rounded-2xl font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all ${
              darkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-emerald-400 border-2 border-emerald-500'
                : 'bg-white hover:bg-gray-50 text-emerald-600 border-2 border-emerald-600'
            } shadow-xl`}
          >
            <TrendingUp size={28} />
            {t('cta.becomeRider')}
          </motion.button>

          {/* Download App */}
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-16 md:h-20 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-2xl"
          >
            <Download size={28} />
            {t('cta.downloadApp')}
          </motion.button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="flex justify-center"
        >
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronDown
              size={40}
              className={darkMode ? 'text-emerald-400' : 'text-emerald-600'}
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );

  // ==================== RIDER BENEFITS SECTION ====================
  const RiderBenefitsSection = () => (
    <motion.section
      id="rider-benefits"
      className={`py-20 px-4 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className={`text-5xl md:text-6xl font-black text-center mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
          initial="hidden"
          whileInView="visible"
          variants={itemVariants}
          viewport={{ once: true }}
        >
          💰 {t('riderBenefits.title')}
        </motion.h2>

        <motion.p
          className={`text-center text-xl mb-12 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}
          initial="hidden"
          whileInView="visible"
          variants={itemVariants}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {t('riderBenefits.subtitle')}
        </motion.p>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {t('riderBenefits.benefits').map((benefit, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              className={`p-6 rounded-2xl transition-all ${
                darkMode
                  ? 'bg-gradient-to-br from-emerald-900 to-gray-800 border border-emerald-700'
                  : 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200'
              } shadow-lg hover:shadow-2xl`}
            >
              <div className="text-4xl mb-4">{benefit.icon}</div>
              <h3 className={`text-lg font-black mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {benefit.title}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );

  // ==================== USER BENEFITS SECTION ====================
  const UserBenefitsSection = () => (
    <motion.section
      id="user-benefits"
      className={`py-20 px-4 ${darkMode ? 'bg-gray-950' : 'bg-gradient-to-b from-blue-50 to-white'}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className={`text-5xl md:text-6xl font-black text-center mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
          initial="hidden"
          whileInView="visible"
          variants={itemVariants}
          viewport={{ once: true }}
        >
          🎯 {t('userBenefits.title')}
        </motion.h2>

        <motion.p
          className={`text-center text-xl mb-12 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}
          initial="hidden"
          whileInView="visible"
          variants={itemVariants}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {t('userBenefits.subtitle')}
        </motion.p>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {t('userBenefits.benefits').map((benefit, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              className={`p-6 rounded-2xl transition-all ${
                darkMode
                  ? 'bg-gradient-to-br from-blue-900 to-gray-800 border border-blue-700'
                  : 'bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200'
              } shadow-lg hover:shadow-2xl`}
            >
              <div className="text-4xl mb-4">{benefit.icon}</div>
              <h3 className={`text-lg font-black mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {benefit.title}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );

  // ==================== INSTANT VS RESERVE SECTION ====================
  const InstantVsReserveSection = () => (
    <motion.section
      id="instant-vs-reserve"
      className={`py-20 px-4 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className={`text-5xl md:text-6xl font-black text-center mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
          initial="hidden"
          whileInView="visible"
          variants={itemVariants}
          viewport={{ once: true }}
        >
          ⚡ {t('instantVsReserve.title')}
        </motion.h2>

        <motion.p
          className={`text-center text-xl mb-16 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}
          initial="hidden"
          whileInView="visible"
          variants={itemVariants}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {t('instantVsReserve.subtitle')}
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Instant Ride Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className={`p-8 rounded-3xl border-2 ${
              darkMode
                ? 'bg-gradient-to-br from-emerald-900 to-gray-800 border-emerald-600'
                : 'bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-400'
            }`}
          >
            <h3 className={`text-3xl font-black mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {t('instantVsReserve.instant.title')}
            </h3>
            <p className={`text-lg font-bold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('instantVsReserve.instant.subtitle')}
            </p>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('instantVsReserve.instant.description')}
            </p>

            <ul className="space-y-3 mb-6">
              {t('instantVsReserve.instant.features').map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check size={24} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              {t('instantVsReserve.instant.vehicleTypes').map((vehicle, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-white'
                  }`}
                >
                  <p className="font-bold text-lg">{vehicle.name}</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {vehicle.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Reserve Ride Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className={`p-8 rounded-3xl border-2 ${
              darkMode
                ? 'bg-gradient-to-br from-blue-900 to-gray-800 border-blue-600'
                : 'bg-gradient-to-br from-blue-100 to-blue-50 border-blue-400'
            }`}
          >
            <h3 className={`text-3xl font-black mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              {t('instantVsReserve.reserve.title')}
            </h3>
            <p className={`text-lg font-bold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('instantVsReserve.reserve.subtitle')}
            </p>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('instantVsReserve.reserve.description')}
            </p>

            <ul className="space-y-3 mb-6">
              {t('instantVsReserve.reserve.features').map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check size={24} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              {t('instantVsReserve.reserve.useCases').map((useCase, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-white'
                  }`}
                >
                  <p className="font-bold text-lg">{useCase.title}</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {useCase.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );

  // ==================== WHY BIHAR SECTION ====================
  const WhyBiharSection = () => (
    <motion.section
      id="why-bihar"
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
          className="text-5xl md:text-6xl font-black text-center mb-4 text-white"
          initial="hidden"
          whileInView="visible"
          variants={itemVariants}
          viewport={{ once: true }}
        >
          🇮🇳 {t('whyBihar.title')}
        </motion.h2>

        <motion.p
          className="text-center text-xl text-emerald-50 mb-12"
          initial="hidden"
          whileInView="visible"
          variants={itemVariants}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {t('whyBihar.subtitle')}
        </motion.p>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {t('whyBihar.benefits').map((benefit, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
            >
              <h3 className="text-xl font-black text-white mb-2">{benefit.title}</h3>
              <p className="text-emerald-100">{benefit.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );

  // ==================== PRICING SECTION ====================
  const PricingSection = () => (
    <motion.section
      id="pricing"
      className={`py-20 px-4 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className={`text-5xl md:text-6xl font-black text-center mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
          initial="hidden"
          whileInView="visible"
          variants={itemVariants}
          viewport={{ once: true }}
        >
          💵 {t('pricing.title')}
        </motion.h2>

        <motion.p
          className={`text-center text-xl mb-12 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}
          initial="hidden"
          whileInView="visible"
          variants={itemVariants}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {t('pricing.subtitle')}
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Instant Pricing */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`p-8 rounded-2xl ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <h3 className={`text-2xl font-black mb-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {t('pricing.instant.title')}
            </h3>
            {t('pricing.instant.examples').map((example, idx) => (
              <div key={idx} className="mb-6 pb-6 border-b border-gray-300 last:border-0 last:pb-0">
                <p className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {example.route}
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Auto</p>
                    <p className={`font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {example.auto}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Bike</p>
                    <p className={`font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {example.bike}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Car</p>
                    <p className={`font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {example.car}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Reserve Pricing */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={`p-8 rounded-2xl ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <h3 className={`text-2xl font-black mb-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {t('pricing.reserve.title')}
            </h3>
            {t('pricing.reserve.examples').map((example, idx) => (
              <div key={idx} className="mb-6 pb-6 border-b border-gray-300 last:border-0 last:pb-0">
                <p className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {example.description}
                </p>
                <div className="space-y-1">
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {example.discount || example.bulk}
                  </p>
                  <p className={`text-2xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {example.price}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );

  // Main render
  return (
    <div>
      <HeroSection />
      <RiderBenefitsSection />
      <UserBenefitsSection />
      <InstantVsReserveSection />
      <WhyBiharSection />
      <PricingSection />
    </div>
  );
};
