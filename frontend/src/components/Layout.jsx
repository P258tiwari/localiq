import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard, Building2, Star, FileText, BarChart2,
  Users, Settings, LogOut, Menu, X
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/clients',   icon: Building2,       label: 'Clients' },
  { to: '/reviews',   icon: Star,            label: 'Reviews' },
  { to: '/posts',     icon: FileText,        label: 'Posts' },
  { to: '/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/users',     icon: Users,           label: 'Team' },
  { to: '/settings',  icon: Settings,        label: 'Settings' }
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-white border-r border-gray-200 transition-all duration-200 shrink-0',
        open ? 'w-56' : 'w-14'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          {open && <span className="font-semibold text-sm text-gray-900 truncate">GMB Dashboard</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => clsx(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0 w-[18px] h-[18px]" />
              {open && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-2.5 border-t border-gray-100">
          <div className={clsx('flex items-center gap-2', !open && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <span className="text-brand-700 text-xs font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            {open && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                </div>
                <button onClick={handleLogout}
                  className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                  title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 h-12 flex items-center gap-3 shrink-0">
          <button onClick={() => setOpen(o => !o)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div className="flex-1" />
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
