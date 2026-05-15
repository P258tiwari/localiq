import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, UserCog, Settings,
  LogOut, ChevronRight, Sparkles, CalendarDays,
} from 'lucide-react';
import localiqLogo from '../../assets/localiq-logo.svg';
import localiqIcon from '../../assets/localiq-icon.svg';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useSidebar } from '../../context/SidebarContext';
import api from '../../services/api';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/clients',   icon: Users,           label: 'Clients', countKey: 'clients' },
  { to: '/billing',   icon: CreditCard,      label: 'Billing'       },
  { to: '/team',      icon: UserCog,         label: 'Team'          },
  { to: '/settings',  icon: Settings,        label: 'Settings'      },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();
  const { mobileOpen, setMobileOpen, tabletExpanded, setTabletExpanded } = useSidebar();

  const { data: clientsData } = useQuery({
    queryKey: ['sidebar-clients'],
    queryFn: () => api.get('/clients?status=active&limit=10').then(r => r.data),
    staleTime: 60_000,
  });
  const activeClients = clientsData?.clients ?? [];
  const clientCount   = clientsData?.total ?? activeClients.length;

  let width = 200;
  let translateX = 0;
  if (isMobile) { width = 240; translateX = mobileOpen ? 0 : -240; }
  else if (isTablet) { width = tabletExpanded ? 200 : 60; }

  const isIconOnly  = isTablet && !tabletExpanded;
  const showLabels  = !isIconOnly;

  async function handleLogout() { await logout(); navigate('/login'); }

  const userInitials = user?.name
    ? user.name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || 'AW';

  const counts = { clients: clientCount };

  return (
    <aside style={{
      width, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 60,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      boxShadow: '1px 0 0 var(--border)',
      display: 'flex', flexDirection: 'column',
      transform: `translateX(${translateX}px)`,
      transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: isIconOnly ? '12px 10px' : '14px 18px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: isIconOnly ? 'center' : 'flex-start',
        flexShrink: 0, minHeight: 60,
      }}>
        {isIconOnly
          ? <img src={localiqIcon} alt="LocalIQ" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          : <img src={localiqLogo} alt="LocalIQ" style={{ height: 32, width: 'auto', maxWidth: 160, objectFit: 'contain' }} />
        }
      </div>

      {/* Navigation */}
      <nav style={{ padding: isIconOnly ? '10px 6px' : '10px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {NAV.map(({ to, icon: Icon, label, countKey }) => (
          <NavLink
            key={to}
            to={to}
            data-label={label}
            className={isIconOnly ? 'sb-tooltip' : ''}
            onClick={() => isMobile && setMobileOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              justifyContent: isIconOnly ? 'center' : 'space-between',
              gap: isIconOnly ? 0 : 8,
              padding: isIconOnly ? '9px 0' : '7px 10px',
              borderRadius: 8, marginBottom: 1,
              textDecoration: 'none', fontSize: 13, fontWeight: 500,
              transition: 'all 0.12s',
              color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-light)' : 'transparent',
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={16} style={{ flexShrink: 0, color: isActive ? 'var(--accent-text)' : 'var(--text-muted)' }} />
                  {showLabels && label}
                </span>
                {showLabels && countKey && counts[countKey] > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
                    borderRadius: 20, padding: '0 5px',
                    background: isActive ? 'var(--accent)' : 'var(--bg-input)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                  }}>
                    {counts[countKey]}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Active Clients list */}
      {showLabels && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 12px' }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px 8px' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Active Clients
            </span>
            {clientCount > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-text)', background: 'var(--accent-light)', borderRadius: 10, padding: '1px 6px' }}>
                {clientCount}
              </span>
            )}
          </div>

          {activeClients.map(c => {
            const initials = (c.business_name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
            return (
              <NavLink
                key={c.id}
                to={`/clients/${c.id}`}
                onClick={() => isMobile && setMobileOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 10px', borderRadius: 10, marginBottom: 2,
                  textDecoration: 'none', transition: 'background 0.15s',
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  border: isActive ? '1px solid rgba(108,62,244,0.18)' : '1px solid transparent',
                })}
                onMouseEnter={e => { if (!e.currentTarget.style.borderColor.includes('108')) e.currentTarget.style.background = 'var(--bg-input)'; }}
                onMouseLeave={e => { if (!e.currentTarget.style.borderColor.includes('108')) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Avatar */}
                {c.logo_url ? (
                  <img
                    src={c.logo_url}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }}
                    onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent) 0%, #9b6dff 100%)',
                  display: c.logo_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.02em',
                }}>
                  {initials}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>
                    {c.business_name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.city || 'No city'}
                  </div>
                </div>

                {/* Active dot */}
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green-text)', flexShrink: 0 }} />
              </NavLink>
            );
          })}

          {activeClients.length === 0 && (
            <div style={{ padding: '12px 10px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No active clients</div>
          )}
        </div>
      )}

      {isIconOnly && <div style={{ flex: 1 }} />}

      {/* Tablet expand toggle */}
      {isTablet && (
        <button
          onClick={() => setTabletExpanded(v => !v)}
          data-label={tabletExpanded ? 'Collapse' : 'Expand'}
          className={isIconOnly ? 'sb-tooltip' : ''}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: isIconOnly ? 'center' : 'flex-start',
            gap: isIconOnly ? 0 : 8,
            padding: isIconOnly ? '9px 0' : '9px 18px',
            margin: isIconOnly ? '0 6px 6px' : '0 8px 8px',
            borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 12, transition: 'all 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <ChevronRight size={15} style={{ transform: tabletExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
          {showLabels && <span>Collapse</span>}
        </button>
      )}

      {/* User footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: isIconOnly ? '10px 6px' : '10px 8px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: isIconOnly ? 'center' : 'flex-start',
          gap: isIconOnly ? 0 : 8,
          padding: isIconOnly ? '4px 0' : '4px 10px',
          borderRadius: 8,
        }}>
          <div
            data-label={user?.name || 'Admin'}
            className={isIconOnly ? 'sb-tooltip' : ''}
            style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}
          >
            {userInitials}
          </div>
          {showLabels && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Admin'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role || 'admin'}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, transition: 'color 0.15s', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red-text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
