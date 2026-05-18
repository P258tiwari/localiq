import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { Camera, X, Upload, Check, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

/* ── Canvas helper: crop the image to a square blob ── */
async function getCroppedBlob(imageSrc, cropPx) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(cropPx.width, cropPx.height);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, cropPx.x, cropPx.y, cropPx.width, cropPx.height, 0, 0, size, size);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas empty')), 'image/jpeg', 0.92);
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

/* ── Crop Modal ── */
function CropModal({ clientId, clientName, imageSrc, onClose, onDone }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPx, setCroppedAreaPx] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_, px) => setCroppedAreaPx(px), []);

  async function handleSave() {
    if (!croppedAreaPx) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPx);
      const fd = new FormData();
      fd.append('logo', blob, 'logo.jpg');
      const res = await api.post(`/clients/${clientId}/logo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onDone(res.data.logo_url);
      toast.success('Logo updated');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14,
        border: '1px solid var(--border)',
        width: '100%', maxWidth: 460,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Crop Logo</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{clientName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Cropper area */}
        <div style={{ position: 'relative', width: '100%', height: 300, background: '#111' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: { border: '2px solid var(--accent)', borderRadius: 8 },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Zoom</span>
          <input
            type="range" min={1} max={3} step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px', justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose} style={{ height: 38 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ height: 38, gap: 7 }}>
            {saving
              ? <><Loader2 size={13} className="spin" /> Saving…</>
              : <><Check size={13} /> Save Logo</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── ClientAvatar ── */
export default function ClientAvatar({ client, size = 36, radius = 8, onLogoUpdate }) {
  const [hovered,   setHovered]   = useState(false);
  const [imageSrc,  setImageSrc]  = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [imgError,  setImgError]  = useState(false);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const initials = (() => {
    const name = client?.business_name || '';
    const parts = name.trim().split(' ');
    return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
  })();

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImageSrc(ev.target.result);
      setModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleLogoDone(logo_url) {
    setImgError(false);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['client', client.id] });
    if (onLogoUpdate) onLogoUpdate(logo_url);
  }

  const hasLogo = !!client?.logo_url && !imgError;

  return (
    <>
      <div
        style={{ position: 'relative', width: size, height: size, flexShrink: 0, cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={e => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
        title={hasLogo ? 'Change logo' : 'Add logo'}
      >
        {/* Avatar */}
        {hasLogo
          ? <img
              src={client.logo_url}
              alt={client.business_name}
              onError={() => setImgError(true)}
              style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', display: 'block', border: '1px solid var(--border)' }}
            />
          : <div style={{
              width: size, height: size, borderRadius: radius,
              background: 'var(--accent-light)', border: '1px solid hsla(219,74%,53%,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: size * 0.33, fontWeight: 700, color: 'var(--accent-text)',
            }}>
              {initials}
            </div>
        }

        {/* Hover overlay */}
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: radius,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2,
          }}>
            <Camera size={size * 0.35} color="#fff" />
            <span style={{ fontSize: Math.max(8, size * 0.18), color: '#fff', fontWeight: 600, lineHeight: 1, textAlign: 'center' }}>
              {hasLogo ? 'Change' : 'Add Logo'}
            </span>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />

      {modalOpen && imageSrc && (
        <CropModal
          clientId={client.id}
          clientName={client.business_name}
          imageSrc={imageSrc}
          onClose={() => { setModalOpen(false); setImageSrc(null); }}
          onDone={handleLogoDone}
        />
      )}
    </>
  );
}
