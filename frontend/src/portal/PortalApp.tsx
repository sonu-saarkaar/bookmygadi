import { BrowserRouter } from 'react-router-dom';
import { PortalRouter } from './PortalRouter';
import { PortalLayout } from './layouts/PortalLayout';
import { usePortalStore } from './store/usePortalStore';

const PortalApp: React.FC = () => {
  const darkMode = usePortalStore((state) => state.darkMode);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className={darkMode ? 'dark' : ''}>
        <PortalLayout>
          <PortalRouter />
        </PortalLayout>
      </div>
    </BrowserRouter>
  );
};

export default PortalApp;
