import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Bell, Plus, X, Menu, ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useSidebar } from '../../context/SidebarContext';
import NotificationPanel from '../NotificationPanel';
import api from '../../services/api';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Search dropdown ─────────────────────────────────────────────────────── */
function SearchDropdown({ results, isLoading, query, onSelect, isMobileOverlay = false }) {
  if (!query || query.length < 3) return null;

  const style = {
    position: isMobileOverlay ? 'relative' : 'absolute',
    top: isMobileOverlay ? 0 : 'calc(100% + 6px)',
    left: 0, right: 0,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: isMobileOverlay ? 1 : 200,
    overflow: 'hidden',
    maxHeight: 320,
    overflowY: 'auto',
    marginTop: isMobileOverlay ? 8 : 0,
  };

  if (isLoading) {
    return (
      <div style={style}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          Searching…
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div style={style}>
        <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
          <Building2 size={14} />
          No clients found for "{query}"
        </div>
      </div>
    );
  }

  return (
    <div style={style}>
      <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Clients · {results.length} result{results.length !== 1 ? 's' : ''}
      </div>
      {results.map(c => (
        <button
          key={c.id}
          onMouseDown={e => { e.preventDefault(); onSelect(c); }}
          style={{
            width: '100%', padding: '10px 14px', background: 'none', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
            textAlign: 'left', borderTop: '1px solid var(--border)', transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'var(--accent-light)', border: '1px solid rgba(108,62,244,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--accent-text)',
          }}>
            {c.business_name?.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.business_name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {[c.category, c.city].filter(Boolean).join(' · ')}
            </div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
            background: c.status === 'active' ? 'var(--green-light)' : 'var(--bg-input)',
            color: c.status === 'active' ? 'var(--green-text)' : 'var(--text-muted)',
            flexShrink: 0, textTransform: 'capitalize',
          }}>
            {c.status}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Main TopBar ─────────────────────────────────────────────────────────── */
export default function TopBar({ title = 'Dashboard' }) {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [search, setSearch]           = useState('');
  const [debouncedQuery, setDebounced] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [panelOpen, setPanelOpen]     = useState(false);
  const { isMobile, isTablet }        = useBreakpoint();
  const { setMobileOpen, setTabletExpanded } = useSidebar();
  const searchRef = useRef(null);

  const now = new Date();
  const monthYear = `${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`;

  /* Notifications */
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => api.get('/notifications?limit=1').then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unreadCount = notifData?.unread ?? 0;

  /* Debounce — only fire after 3 chars with 300ms delay */
  useEffect(() => {
    if (search.length >= 3) {
      const t = setTimeout(() => setDebounced(search), 300);
      return () => clearTimeout(t);
    } else {
      setDebounced('');
      setDropdownOpen(false);
    }
  }, [search]);

  /* Open dropdown when debounced query is ready */
  useEffect(() => {
    if (debouncedQuery.length >= 3) setDropdownOpen(true);
  }, [debouncedQuery]);

  /* Close dropdown on route change */
  useEffect(() => {
    setDropdownOpen(false);
    setSearch('');
    setDebounced('');
    setSearchOpen(false);
  }, [location.pathname]);

  /* Close dropdown on outside click */
  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Escape key */
  useEffect(() => {
    function handler(e) {
      if (e.key === 'Escape') { setDropdownOpen(false); setSearch(''); setDebounced(''); }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  /* AJAX search — only enabled when debouncedQuery >= 3 chars */
  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ['client-search', debouncedQuery],
    queryFn:  () => api.get('/clients', { params: { search: debouncedQuery, limit: 8 } }).then(r => r.data),
    enabled: debouncedQuery.length >= 3,
    staleTime: 30_000,
  });
  const searchResults = searchData?.clients ?? [];

  function handleSelect(client) {
    navigate(`/clients/${client.id}`);
    setSearch('');
    setDebounced('');
    setDropdownOpen(false);
    setSearchOpen(false);
  }

  function clearSearch() {
    setSearch('');
    setDebounced('');
    setDropdownOpen(false);
  }

  function handleHamburger() {
    if (isMobile) setMobileOpen(v => !v);
    else if (isTablet) setTabletExpanded(v => !v);
  }

  const userInitials = user?.name
    ? user.name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || 'AW';

  /* ── Mobile search overlay ─────────────────────────────────────────────── */
  if (isMobile && searchOpen) {
    return (
      <div style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <header style={{
          height: 'var(--topbar-h)', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)', display: 'flex', alignItems: 'center',
          gap: 10, padding: '0 12px',
        }}>
          <button
            onClick={() => { setSearchOpen(false); clearSearch(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, borderRadius: 8, flexShrink: 0, display: 'flex' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              autoFocus
              type="text"
              placeholder="Search clients"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: 32, paddingRight: search ? 32 : 12, height: 36, fontSize: 13, width: '100%' }}
            />
            {search && (
              <button onClick={clearSearch}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            )}
          </div>
        </header>
        {/* Mobile dropdown below header */}
        {dropdownOpen && (
          <div style={{ background: 'var(--bg-app)', padding: '0 12px 12px' }}>
            <SearchDropdown
              results={searchResults}
              isLoading={searchLoading}
              query={debouncedQuery}
              onSelect={handleSelect}
              isMobileOverlay
            />
          </div>
        )}
      </div>
    );
  }

  /* ── Normal TopBar ─────────────────────────────────────────────────────── */
  return (
    <>
      <header style={{
        height: 'var(--topbar-h)', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', display: 'flex', alignItems: 'center',
        gap: isMobile ? 10 : 14, padding: isMobile ? '0 14px' : '0 24px',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        {/* Hamburger */}
        {(isMobile || isTablet) && (
          <button onClick={handleHamburger}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
          >
            <Menu size={16} />
          </button>
        )}

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flex: isMobile ? 1 : '0 0 auto', minWidth: 0 }}>
          <h1 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </h1>
          {!isMobile && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, whiteSpace: 'nowrap' }}>
              / {monthYear}
            </span>
          )}
        </div>

        {!isMobile && <div style={{ flex: 1 }} />}

        {/* Search bar — desktop + tablet */}
        {!isMobile && (
          <div ref={searchRef} style={{ position: 'relative', width: isTablet ? 220 : 300 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
            <input
              type="text"
              placeholder="Search clients"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => { if (debouncedQuery.length >= 3) setDropdownOpen(true); }}
              className="input"
              style={{ paddingLeft: 32, paddingRight: search ? 30 : 10, height: 36, fontSize: 13 }}
            />
            {search && (
              <button onClick={clearSearch}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', zIndex: 1, display: 'flex', padding: 2 }}>
                <X size={13} />
              </button>
            )}
            {/* Dropdown */}
            {dropdownOpen && (
              <SearchDropdown
                results={searchResults}
                isLoading={searchLoading}
                query={debouncedQuery}
                onSelect={handleSelect}
              />
            )}
          </div>
        )}

        {/* Search icon — mobile */}
        {isMobile && (
          <button onClick={() => setSearchOpen(true)}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
          >
            <Search size={15} />
          </button>
        )}

        {/* New Client */}
        {!isMobile && (
          <button className="btn-primary" onClick={() => navigate('/clients/new')}
            style={{ height: 36, paddingLeft: 14, paddingRight: 14, fontSize: 13, gap: 6, flexShrink: 0 }}>
            <Plus size={14} />
            {!isTablet && 'New Client'}
          </button>
        )}
        {isMobile && (
          <button onClick={() => navigate('/clients/new')}
            style={{ width: 34, height: 34, borderRadius: 8, background: '#111827', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <Plus size={15} />
          </button>
        )}

        {/* Bell */}
        <button onClick={() => setPanelOpen(v => !v)}
          style={{
            position: 'relative', width: 34, height: 34, borderRadius: 8,
            border: `1px solid ${panelOpen ? 'rgba(108,62,244,0.4)' : 'var(--border)'}`,
            background: panelOpen ? 'var(--accent-light)' : 'var(--bg-card)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: panelOpen ? 'var(--accent-text)' : 'var(--text-secondary)',
            transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { if (!panelOpen) e.currentTarget.style.background = 'var(--bg-input)'; }}
          onMouseLeave={e => { if (!panelOpen) e.currentTarget.style.background = 'var(--bg-card)'; }}
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 16, height: 16, borderRadius: 20,
              background: '#EF4444', border: '2px solid var(--bg-card)',
              color: '#fff', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, cursor: 'default', flexShrink: 0,
        }}>
          {userInitials}
        </div>
      </header>

      {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}
    </>
  );
}
