import { Routes, Route } from 'react-router-dom';
import { PortalHome } from './pages/PortalHome';

export const PortalRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PortalHome />} />
      <Route path="*" element={<div className="text-center py-20">Page not found</div>} />
    </Routes>
  );
};
