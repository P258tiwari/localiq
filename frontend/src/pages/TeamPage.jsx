import { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Mail, Shield, MoreHorizontal, Edit2, Trash2, X, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

function Portal({ children }) { return createPortal(children, document.body); }

const ROLE_OPTS   = [{ val: 'member', label: 'Member', desc: 'Standard access' }, { val: 'admin', label: 'Admin', desc: 'Full access' }];
const STATUS_OPTS = [{ val: 'active', label: 'Active', desc: 'Can log in' }, { val: 'inactive', label: 'Inactive', desc: 'Access disabled' }];

function RadioCards({ options, value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {options.map(opt => (
        <label key={opt.val} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${value === opt.val ? 'hsla(219,74%,53%,0.5)' : 'var(--border)'}`, background: value === opt.val ? 'var(--accent-light)' : 'var(--bg-input)', cursor: 'pointer', transition: 'all 0.15s' }}>
          <input type="radio" name={opt.val + '_grp'} value={opt.val} checked={value === opt.val} onChange={() => onChange(opt.val)} style={{ display: 'none' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: value === opt.val ? 'var(--accent-text)' : 'var(--text-primary)' }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
          </div>
        </label>
      ))}
    </div>
  );
}

const ROLE_COLORS = {
  admin:  { bg: 'var(--accent-light)', color: 'var(--accent-text)',   label: 'Admin'  },
  member: { bg: 'var(--bg-input)',     color: 'var(--text-secondary)', label: 'Member' },
};

function AddMemberModal({ onClose }) {
  const queryClient  = useQueryClient();
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [role, setRole]     = useState('member');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/users', { name, email, role, password });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally { setLoading(false); }
  }

  return (
    <Portal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 440 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Add Team Member</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>
          <form onSubmit={submit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red-text)', borderRadius: 8, fontSize: 13 }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}
            <div className="field">
              <label className="label">Full Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@ampwake.com" required />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a password" required minLength={8} />
            </div>
            <div className="field">
              <label className="label">Role</label>
              <RadioCards options={ROLE_OPTS} value={role} onChange={setRole} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? <><Loader2 size={14} className="spin" /> Adding…</> : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

function EditMemberModal({ member, onClose }) {
  const queryClient  = useQueryClient();
  const [name, setName]     = useState(member.name);
  const [role, setRole]     = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/users/${member.id}`, { name, role, status });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update member');
    } finally { setLoading(false); }
  }

  return (
    <Portal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 440 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Edit Member</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>
          <form onSubmit={submit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red-text)', borderRadius: 8, fontSize: 13 }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}
            <div className="field">
              <label className="label">Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Role</label>
              <RadioCards options={ROLE_OPTS} value={role} onChange={setRole} />
            </div>
            <div className="field">
              <label className="label">Status</label>
              <RadioCards options={STATUS_OPTS} value={status} onChange={setStatus} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? <><Loader2 size={14} className="spin" /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

function MemberCard({ member }) {
  const queryClient     = useQueryClient();
  const { user: me }    = useAuthStore();
  const roleStyle       = ROLE_COLORS[member.role] || ROLE_COLORS.member;
  const [menu, setMenu]         = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const isActive  = member.status === 'active';
  const isSelf    = me?.id === member.id;
  const isAdmin   = me?.role === 'admin';
  const initials  = member.name
    ? member.name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : member.email?.slice(0, 2).toUpperCase() || '??';

  const menuItems = [
    isAdmin && { icon: Edit2,  label: 'Edit Member',  color: 'var(--text-primary)', handler: () => { setMenu(false); setShowEdit(true); } },
    !isSelf && { icon: Trash2, label: 'Remove Member', color: 'var(--red-text)',    handler: handleRemove },
  ].filter(Boolean);

  async function handleRemove() {
    if (!confirm(`Remove ${member.name}? They will be deactivated.`)) return;
    setMenu(false);
    try {
      await api.delete(`/users/${member.id}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove user');
    }
  }

  return (
    <>
      <div className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: isActive ? 'var(--accent-light)' : 'var(--bg-input)',
              border: `1px solid ${isActive ? 'hsla(219,74%,53%,0.3)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 500,
              color: isActive ? 'var(--accent-text)' : 'var(--text-muted)',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{member.name}</div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: roleStyle.bg, color: roleStyle.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {member.role === 'admin' && <Shield size={9} />}
                {roleStyle.label}
              </span>
            </div>
          </div>
          {menuItems.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenu(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}>
                <MoreHorizontal size={16} />
              </button>
              {menu && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', zIndex: 10, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  {menuItems.map(item => (
                    <button key={item.label} onClick={item.handler} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: item.color }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <item.icon size={13} /> {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Joined</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {member.created_at ? new Date(member.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Status</div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: isActive ? 'var(--green-light)' : 'var(--bg-input)', color: isActive ? 'var(--green-text)' : 'var(--text-muted)' }}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {showEdit && <EditMemberModal member={member} onClose={() => setShowEdit(false)} />}
    </>
  );
}

function PlaceholderCard({ onAdd }) {
  return (
    <button
      onClick={onAdd}
      style={{ border: '1.5px dashed var(--border)', borderRadius: 12, background: 'transparent', cursor: 'pointer', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.15s', minHeight: 200 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsla(219,74%,53%,0.4)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, border: '1.5px dashed hsla(219,74%,53%,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <UserPlus size={18} style={{ color: 'var(--accent-text)' }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>Add Team Member</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Invite a new member</div>
    </button>
  );
}

export default function TeamPage() {
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
    staleTime: 30_000,
  });

  const users = data?.users ?? [];
  const activeCount = users.filter(u => u.status === 'active').length;
  const adminCount  = users.filter(u => u.role === 'admin').length;

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Members', value: isLoading ? '—' : users.length,       color: 'var(--text-primary)' },
          { label: 'Active',        value: isLoading ? '—' : activeCount,         color: 'var(--green-text)'  },
          { label: 'Admins',        value: isLoading ? '—' : adminCount,          color: 'var(--accent-text)' },
        ].map(item => (
          <div key={item.label} className="card" style={{ padding: '14px 20px', flex: '1 1 120px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 32, color: item.color, lineHeight: 1 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Error state */}
      {isError && (
        <div className="card error-state" style={{ marginBottom: 16 }}>
          <div className="error-state-emoji">⚠️</div>
          <div className="error-state-title">Failed to load team members</div>
          <div className="error-state-sub">Check your connection and try again</div>
          <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Team grid — 1 col mobile, 2 col tablet, 3 col desktop */}
      {!isError && <div className="rg-team">
        {isLoading
          ? [...Array(3)].map((_, i) => <div key={i} className="skeleton card" style={{ height: 220 }} />)
          : users.map(m => <MemberCard key={m.id} member={m} />)
        }
        <PlaceholderCard onAdd={() => setShowModal(true)} />
      </div>}

      {showModal && <AddMemberModal onClose={() => setShowModal(false)} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
