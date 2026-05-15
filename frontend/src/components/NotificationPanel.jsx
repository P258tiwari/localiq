import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, CreditCard, FileText, Sparkles, Users, Settings,
  CheckCheck, X, Loader2, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';

const PER_PAGE = 5;
import api from '../services/api';

/* ── helpers ────────────────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function typeIcon(type) {
  switch (type) {
    case 'payment_due':  return <CreditCard  size={14} style={{ color: 'var(--yellow-text)' }} />;
    case 'post_pending': return <FileText    size={14} style={{ color: 'var(--accent-text)' }} />;
    case 'ai_ready':     return <Sparkles    size={14} style={{ color: 'var(--accent-text)' }} />;
    case 'team':         return <Users       size={14} style={{ color: 'var(--green-text)'  }} />;
    default:             return <Settings    size={14} style={{ color: 'var(--text-muted)'  }} />;
  }
}

function notifLink(notif) {
  if (notif.client_id) {
    if (notif.type === 'payment_due') return `/billing`;
    return `/clients/${notif.client_id}`;
  }
  if (notif.type === 'team')   return '/team';
  if (notif.type === 'system') return '/settings';
  return '/dashboard';
}

/* ── main component ─────────────────────────────────────────────────────────── */
export default function NotificationPanel({ onClose }) {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const panelRef     = useRef(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => api.get('/notifications?limit=30').then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const notifications = data?.notifications ?? [];
  const unread        = data?.unread ?? 0;
  const totalPages    = Math.max(1, Math.ceil(notifications.length / PER_PAGE));
  const paged         = notifications.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* close on outside click */
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  /* close on Escape */
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function markRead(id) {
    await api.patch(`/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  async function markAllRead() {
    await api.post('/notifications/mark-all-read');
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  async function dismiss(e, id) {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  function handleClick(notif) {
    if (!notif.is_read) markRead(notif.id);
    navigate(notifLink(notif));
    onClose();
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: 68,
        right: 16,
        width: 380,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: '80vh',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={15} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</span>
          {unread > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: 'var(--accent)', color: '#fff',
              borderRadius: 20, padding: '1px 7px',
            }}>
              {unread}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isFetching && <Loader2 size={13} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          <button
            onClick={() => refetch()}
            title="Refresh"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <RefreshCw size={13} />
          </button>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              title="Mark all as read"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--green-text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <CheckCheck size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Loader2 size={24} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Bell size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>All caught up</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No notifications yet</div>
          </div>
        ) : (
          paged.map(notif => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 18px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                background: notif.is_read ? 'transparent' : 'rgba(108,62,244,0.04)',
                transition: 'background 0.1s',
                position: 'relative',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(108,62,244,0.04)'}
            >
              {/* Unread dot */}
              {!notif.is_read && (
                <div style={{
                  position: 'absolute', top: 16, left: 7,
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--accent)',
                }} />
              )}

              {/* Type icon */}
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {typeIcon(notif.type)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: notif.is_read ? 400 : 600,
                  color: 'var(--text-primary)',
                  marginBottom: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {notif.title}
                </div>
                {notif.message && (
                  <div style={{
                    fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {notif.message}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {notif.client_name && (
                    <>
                      <span style={{ color: 'var(--accent-text)' }}>{notif.client_name}</span>
                      <span>·</span>
                    </>
                  )}
                  {timeAgo(notif.created_at)}
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={e => dismiss(e, notif.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 2, borderRadius: 4,
                  flexShrink: 0, display: 'flex', opacity: 0.5,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          gap: 8,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
            {notifications.length} notification{notifications.length > 1 ? 's' : ''}
            {unread > 0 ? ` · ${unread} unread` : ''}
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', opacity: page === 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 48, textAlign: 'center' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === totalPages ? 'default' : 'pointer', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', opacity: page === totalPages ? 0.4 : 1 }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
