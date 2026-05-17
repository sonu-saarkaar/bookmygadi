import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { usePortalStore } from '../store/usePortalStore';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children }) => {
  const { setActiveSection } = usePortalStore();
  const darkMode = usePortalStore((state) => state.darkMode);

  const handleSectionClick = (section: string) => {
    setActiveSection(section);
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      <Navbar onSectionClick={handleSectionClick} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};
