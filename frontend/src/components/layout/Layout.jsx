import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/clients':   'Clients',
  '/billing':   'Billing',
  '/team':      'Team',
  '/settings':  'Settings',
};

function getTitle(pathname) {
  if (pathname.startsWith('/clients/') && pathname !== '/clients/new') return 'Client Overview';
  if (pathname === '/clients/new') return 'New Client';
  return PAGE_TITLES[pathname] || 'Ampwake Local';
}

function LayoutInner() {
  const { pathname } = useLocation();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const { mobileOpen, setMobileOpen, tabletExpanded } = useSidebar();

  /* Scroll to top on route change */
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  /* Document title */
  useEffect(() => {
    document.title = `${getTitle(pathname)} — Ampwake Local`;
  }, [pathname]);

  /* Lock body scroll when mobile sidebar is open */
  useEffect(() => {
    document.body.style.overflow = (isMobile && mobileOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, mobileOpen]);

  /* Close mobile sidebar on route change */
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  /* Main content left margin */
  let marginLeft = 0;
  if (isDesktop) marginLeft = 200;
  else if (isTablet) marginLeft = tabletExpanded ? 200 : 60;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

      <Sidebar />

      <div style={{
        flex: 1,
        marginLeft,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        minWidth: 0,
      }}>
        <TopBar title={getTitle(pathname)} />
        <main
          key={pathname}
          className="page-in"
          style={{ flex: 1, overflowX: 'hidden' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <SidebarProvider>
      <LayoutInner />
    </SidebarProvider>
  );
}
