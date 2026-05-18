import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Key, User, Shield, Loader2, Upload, X, Lock, Pencil, Check } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

function AgencySettingsCard() {
  const fileRef = useRef(null);
  const [logo, setLogo] = useState(() => localStorage.getItem('agency_logo') || null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogo(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function save() {
    if (logo) localStorage.setItem('agency_logo', logo);
    else localStorage.removeItem('agency_logo');
    toast.success('Settings saved');
  }

  return (
    <div className="card" style={{ padding: '20px 24px', marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={15} style={{ color: 'var(--accent-text)' }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Agency Settings</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Logo upload — 1:1 */}
        <div className="field">
          <label className="label">Agency Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Preview box */}
            <div
              onClick={() => !logo && fileRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: 12, flexShrink: 0,
                border: `2px dashed ${logo ? 'var(--border)' : 'hsla(219,74%,53%,0.4)'}`,
                background: logo ? 'transparent' : 'var(--bg-input)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: logo ? 'default' : 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              {logo
                ? <img src={logo} alt="Agency logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Upload size={20} style={{ color: 'var(--accent-text)' }} />
              }
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-ghost"
                style={{ fontSize: 12, height: 32, paddingLeft: 14, paddingRight: 14, gap: 6 }}
              >
                <Upload size={12} /> {logo ? 'Change Logo' : 'Upload Logo'}
              </button>
              {logo && (
                <button
                  type="button"
                  onClick={removeLogo}
                  style={{ fontSize: 12, height: 32, paddingLeft: 14, paddingRight: 14, background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red-text)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <X size={12} /> Remove
                </button>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Square image · PNG or JPG</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleFile} />
        </div>

        <div className="field">
          <label className="label">Agency Name</label>
          <input className="input" defaultValue="Ampwake" placeholder="Agency name" />
        </div>
        <div className="field">
          <label className="label">Default AI Tone</label>
          <select className="input" defaultValue="professional">
            <option value="professional">Professional</option>
            <option value="warm">Warm & Friendly</option>
            <option value="brief">Brief</option>
          </select>
        </div>
        <button onClick={save} className="btn-primary" style={{ height: 40, width: 'fit-content', paddingLeft: 24, paddingRight: 24 }}>
          Save Settings
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuthStore();

  /* ── Inline name edit ── */
  const [editingName, setEditingName] = useState(false);
  const [nameValue,   setNameValue]   = useState('');
  const nameInputRef = useRef(null);

  function startEditName() {
    setNameValue(user?.name || '');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }

  const nameMut = useMutation({
    mutationFn: name => api.patch(`/users/${user.id}`, { name }),
    onSuccess: async () => {
      await refreshUser();
      setEditingName(false);
      toast.success('Name updated');
    },
    onError: e => toast.error(e.response?.data?.error || 'Failed to update name'),
  });

  function saveName() {
    const trimmed = nameValue.trim();
    if (!trimmed) return toast.error('Name cannot be empty');
    if (trimmed === user?.name) { setEditingName(false); return; }
    nameMut.mutate(trimmed);
  }

  function handleNameKey(e) {
    if (e.key === 'Enter')  saveName();
    if (e.key === 'Escape') setEditingName(false);
  }

  /* ── Role chip color ── */
  const roleStyle = user?.role === 'admin'
    ? { background: 'var(--accent-light)', color: 'var(--accent-text)', border: '1px solid hsla(219,74%,53%,0.2)' }
    : { background: 'var(--bg-input)',     color: 'var(--text-secondary)', border: '1px solid var(--border)' };

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');

  const mut = useMutation({
    mutationFn: data => api.put('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password updated successfully');
      setCurrentPw('');
      setNewPw('');
    },
    onError: e => toast.error(e.response?.data?.error || 'Failed to update password'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (newPw.length < 8) return toast.error('New password must be at least 8 characters');
    mut.mutate({ currentPassword: currentPw, newPassword: newPw });
  }

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 40, maxWidth: 600 }}>
      {/* Account card */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={15} style={{ color: 'var(--accent-text)' }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Account Information</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Name — inline editable */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>Name</span>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  ref={nameInputRef}
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={handleNameKey}
                  onBlur={saveName}
                  className="input"
                  style={{ height: 30, fontSize: 13, padding: '0 10px', width: 200, textAlign: 'right' }}
                />
                {nameMut.isPending
                  ? <Loader2 size={13} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  : <Check size={13} style={{ color: 'var(--green-text)', cursor: 'pointer', flexShrink: 0 }} onMouseDown={saveName} />
                }
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.name || '—'}</span>
                <button
                  onClick={startEditName}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 4, display: 'flex', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  title="Edit name"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Email — locked */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Email</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Lock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.email || '—'}</span>
            </div>
          </div>

          {/* Role — chip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Role</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', ...roleStyle }}>
              {user?.role || '—'}
            </span>
          </div>

        </div>
      </div>

      {/* Change password card */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Key size={15} style={{ color: 'var(--accent-text)' }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Change Password</span>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="Enter current password"
              required
            />
          </div>
          <div className="field">
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="Min 8 characters"
              required
            />
          </div>
          <button type="submit" disabled={mut.isPending} className="btn-primary" style={{ height: 40, width: 'fit-content', paddingLeft: 24, paddingRight: 24 }}>
            {mut.isPending ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Updating…
              </span>
            ) : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Agency info card */}
      <AgencySettingsCard />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
