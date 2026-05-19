import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import ClientAvatar from '../components/ui/ClientAvatar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBreakpoint } from '../hooks/useBreakpoint';
import {
  MapPin, Phone, Globe, Star, ArrowLeft, Copy, Check,
  Sparkles, CheckCircle2, Circle, ExternalLink,
  Building2, FileText, Tag, CreditCard, MessageCircle, StickyNote,
  CalendarDays, Image, ChevronDown, Loader2, RefreshCw,
  Plus, User, Download, AlertCircle, Pencil, Trash2, ToggleLeft, ToggleRight, X, Maximize2,
} from 'lucide-react';
import { downloadCSV, downloadTXT } from '../utils/exportCSV';
import api from '../services/api';

function Portal({ children }) {
  return createPortal(children, document.body);
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TABS = [
  { id: 'overview',  label: 'Overview',    icon: Building2     },
  { id: 'ai',        label: 'AI Profile',  icon: Sparkles      },
  { id: 'posts',     label: 'Posts',       icon: FileText      },
  { id: 'keywords',  label: 'Keywords',    icon: Tag           },
  { id: 'billing',   label: 'Billing',     icon: CreditCard    },
  { id: 'reviews',   label: 'Reviews',     icon: MessageCircle },
  { id: 'notes',     label: 'Notes',       icon: StickyNote    },
];

const CTA_LABELS = { BOOK_APPOINTMENT: 'Book Appointment', LEARN_MORE: 'Learn More', CALL_NOW: 'Call Now', GET_OFFER: 'Get Offer' };
const POST_TYPE_STYLE = {
  offer:   { bg: 'var(--yellow-light)', color: 'var(--yellow-text)' },
  update:  { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
  event:   { bg: 'var(--green-light)',  color: 'var(--green-text)'  },
};

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional'   },
  { value: 'warm',         label: 'Warm & Friendly' },
  { value: 'apologetic',   label: 'Apologetic'      },
  { value: 'brief',        label: 'Brief'           },
];


/* ─── Shared helpers ─────────────────────────────────────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  return (
    <button onClick={copy} style={{ background: copied ? 'var(--green-light)' : 'var(--bg-input)', border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`, color: copied ? 'var(--green-text)' : 'var(--text-secondary)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ─── Inline field edit popup ────────────────────────────────────────────── */
function InlineEditPopup({ config, onSave, onClose }) {
  const [val, setVal] = useState(
    config.type === 'tel'
      ? (config.value ?? '').replace(/^\+91/, '')
      : (config.value ?? '')
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const finalVal = config.type === 'tel'
      ? (val.trim() ? `+91${val.replace(/\D/g, '').slice(0, 10)}` : '')
      : val;
    await onSave(config.fieldKey, finalVal, config.isBilling ?? false);
    setSaving(false);
  }

  function handleKey(e) { if (e.key === 'Escape') onClose(); }

  const iw = { width: '100%', boxSizing: 'border-box' };

  return (
    <Portal>
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: '22px 22px 18px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }} onKeyDown={handleKey}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{config.label}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={15} /></button>
        </div>

        {/* Input */}
        {config.type === 'textarea' && (
          <textarea autoFocus className="input" rows={5} style={{ ...iw, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
            value={val} onChange={e => setVal(e.target.value)} placeholder={config.placeholder} />
        )}
        {config.type === 'select' && (
          <div style={{ position: 'relative' }}>
            <select autoFocus className="input" style={{ ...iw, appearance: 'none' }} value={val} onChange={e => setVal(e.target.value)}>
              <option value="">Select…</option>
              {config.options?.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>
        )}
        {config.type === 'tag' && (
          <TagInput value={val} onChange={setVal} placeholder={config.placeholder} />
        )}
        {config.type === 'tel' && (
          <div style={{ display: 'flex' }}>
            <span style={{ padding: '0 11px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: '8px 0 0 8px', display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', flexShrink: 0, userSelect: 'none' }}>+91</span>
            <input autoFocus className="input" type="tel" inputMode="numeric" maxLength={10}
              style={{ borderRadius: '0 8px 8px 0', fontFamily: 'DM Mono, monospace', flex: 1 }}
              value={val} onChange={e => setVal(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="98765 43210"
              onKeyDown={e => { if (e.key === 'Enter') save(); }} />
          </div>
        )}
        {!['textarea','select','tag','tel'].includes(config.type) && (
          <input autoFocus className="input" style={{ ...iw, fontFamily: config.type === 'number' || config.type === 'date' ? 'DM Mono, monospace' : 'inherit', colorScheme: config.type === 'date' ? 'dark' : undefined }}
            type={config.type} value={val} onChange={e => setVal(e.target.value)}
            placeholder={config.placeholder}
            onKeyDown={e => { if (e.key === 'Enter') save(); }} />
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn-ghost" style={{ flex: 1, height: 36 }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ flex: 1, height: 36, gap: 7 }} onClick={save} disabled={saving}>
            {saving ? <><Loader2 size={12} className="spin" /> Saving…</> : <><Check size={12} /> Save</>}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ─── Overview row helpers ───────────────────────────────────────────────── */
function InfoRow({ label, value, link, onEdit }) {
  const isEmpty = !value;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, marginRight: 12, paddingTop: 1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flexShrink: 1 }}>
        {isEmpty ? (
          <button onClick={onEdit} style={{ fontSize: 11, color: 'var(--accent-text)', background: 'var(--accent-light)', border: '1px solid hsla(219,74%,53%,0.2)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px' }}>
            <Pencil size={9} /> Add
          </button>
        ) : link ? (
          <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }}>
            {value.replace(/^https?:\/\//, '')} <ExternalLink size={10} style={{ flexShrink: 0 }} />
          </a>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
        )}
        {!isEmpty && (
          <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0, opacity: 0.4, display: 'flex', borderRadius: 4, transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.4}>
            <Pencil size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

function ChipsRow({ label, value, onEdit }) {
  const chips = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: chips.length ? 8 : 0 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
        {chips.length === 0 ? (
          <button onClick={onEdit} style={{ fontSize: 11, color: 'var(--accent-text)', background: 'var(--accent-light)', border: '1px solid hsla(219,74%,53%,0.2)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px' }}>
            <Pencil size={9} /> Add
          </button>
        ) : (
          <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, opacity: 0.4, display: 'flex', borderRadius: 4, transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.4}>
            <Pencil size={10} />
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {chips.map((c, i) => (
            <span key={i} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--accent-light)', border: '1px solid hsla(219,74%,53%,0.2)', color: 'var(--accent-text)', fontWeight: 500 }}>{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

/* ─── Overview Tab ───────────────────────────────────────────────────────── */
function OverviewTab({ client, billing, onFieldEdit }) {
  function f(label, fieldKey, value, type, extra = {}) {
    return () => onFieldEdit({ label, fieldKey, value: value ?? '', type, ...extra });
  }

  const STATES_OPTS = INDIAN_STATES_LIST.map(s => ({ value: s, label: s }));
  const PLAN_OPTS   = ['Free','Starter','Basic','Pro','Premium','Custom'];
  const CYCLE_OPTS  = [{ value:'monthly', label:'Monthly' }, { value:'quarterly', label:'Quarterly' }, { value:'annually', label:'Yearly' }];
  const TONE_OPTS   = ['professional','friendly','luxury','budget-friendly','medical','traditional','modern'].map(t => ({ value: t, label: t.charAt(0).toUpperCase()+t.slice(1) }));
  const LANG_OPTS   = ['English','Hindi','English + Hindi','Hinglish','Regional'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>

      <SectionCard title="Business Identity">
        <InfoRow label="Business Name"    value={client?.business_name}  onEdit={f('Business Name',    'business_name',  client?.business_name,  'text', { placeholder: 'e.g. Sharma Dental Clinic' })} />
        <InfoRow label="Contact Person"   value={client?.client_name}    onEdit={f('Contact Person',   'client_name',    client?.client_name,    'text', { placeholder: 'Dr. Rajesh Sharma' })} />
        <InfoRow label="Owner / Director" value={client?.owner_name}     onEdit={f('Owner / Director', 'owner_name',     client?.owner_name,     'text', { placeholder: 'Priya Sharma' })} />
        <InfoRow label="Category"         value={client?.category}       onEdit={f('Category',         'category',       client?.category,       'text', { placeholder: 'Dental Clinic' })} />
        <InfoRow label="Industry"         value={client?.industry}       onEdit={f('Industry',         'industry',       client?.industry,       'text', { placeholder: 'Healthcare' })} />
        <InfoRow label="Business Type"    value={client?.business_type}  onEdit={f('Business Type',    'business_type',  client?.business_type,  'text', { placeholder: 'e.g. Multi-speciality clinic' })} />
      </SectionCard>

      <SectionCard title="Contact & Online">
        <InfoRow label="Phone"    value={client?.phone}    onEdit={f('Phone',    'phone',    client?.phone,    'tel')} />
        <InfoRow label="WhatsApp" value={client?.whatsapp} onEdit={f('WhatsApp', 'whatsapp', client?.whatsapp, 'tel')} />
        <InfoRow label="Email"    value={client?.email}    onEdit={f('Email',    'email',    client?.email,    'email', { placeholder: 'hello@example.com' })} />
        <InfoRow label="Website"  value={client?.website}  link onEdit={f('Website', 'website', client?.website, 'url', { placeholder: 'https://example.com' })} />
      </SectionCard>

      <SectionCard title="Address">
        <InfoRow label="Street"  value={client?.address} onEdit={f('Street Address', 'address', client?.address, 'text', { placeholder: 'Shop 12, Main Market…' })} />
        <InfoRow label="City"    value={client?.city}    onEdit={f('City',    'city',    client?.city,    'text', { placeholder: 'New Delhi' })} />
        <InfoRow label="State"   value={client?.state}   onEdit={f('State',   'state',   client?.state,   'select', { options: STATES_OPTS })} />
        <InfoRow label="Pincode" value={client?.pincode} onEdit={f('Pincode', 'pincode', client?.pincode, 'text', { placeholder: '110001' })} />
      </SectionCard>

      <SectionCard title="Google Business Profile">
        <InfoRow label="GBP Link"    value={client?.gbp_link}    link onEdit={f('GBP Link',    'gbp_link',    client?.gbp_link,    'url', { placeholder: 'https://maps.app.goo.gl/…' })} />
        <InfoRow label="Localo Link" value={client?.localo_link} link onEdit={f('Localo Link', 'localo_link', client?.localo_link, 'url', { placeholder: 'https://localo.com/…' })} />
        <InfoRow label="About the Business" value={client?.gbp_description_current ? client.gbp_description_current.slice(0, 80) + (client.gbp_description_current.length > 80 ? '…' : '') : null}
          onEdit={f('About the Business', 'gbp_description_current', client?.gbp_description_current, 'textarea', { placeholder: 'Describe the business…' })} />
      </SectionCard>

      <SectionCard title="Target Audience">
        <InfoRow  label="Audience Description" value={client?.target_audience} onEdit={f('Target Audience', 'target_audience', client?.target_audience, 'text', { placeholder: 'e.g. Business owners, age 30-50' })} />
        <ChipsRow label="Target Areas"         value={client?.target_areas}    onEdit={f('Target Areas',    'target_areas',    client?.target_areas,    'tag',  { placeholder: 'e.g. Kanpur, Lucknow…' })} />
      </SectionCard>

      <SectionCard title="Content Strategy">
        <InfoRow label="Brand Tone" value={client?.brand_tone}         onEdit={f('Brand Tone', 'brand_tone', client?.brand_tone, 'select', { options: TONE_OPTS })} />
        <InfoRow label="Language"   value={client?.language_preference} onEdit={f('Language',  'language_preference', client?.language_preference, 'select', { options: LANG_OPTS })} />
        <InfoRow label="SEO Goal"   value={client?.monthly_objective}  onEdit={f('SEO Goal',   'monthly_objective', client?.monthly_objective, 'text', { placeholder: 'Rank #1 for …' })} />
      </SectionCard>

      <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        <SectionCard title="Services Offered">
          <ChipsRow label="Services" value={client?.services} onEdit={f('Services Offered', 'services', client?.services, 'tag', { placeholder: 'e.g. Teeth cleaning, Braces…' })} />
        </SectionCard>
        <SectionCard title="USP & Products">
          <ChipsRow label="Unique Selling Points" value={client?.usp}      onEdit={f('Unique Selling Points', 'usp',      client?.usp,      'tag', { placeholder: 'e.g. 15 years experience…' })} />
          <ChipsRow label="Products"              value={client?.products} onEdit={f('Products',              'products', client?.products, 'tag', { placeholder: 'e.g. Dental kits…' })} />
        </SectionCard>
        <SectionCard title="Internal Notes">
          {client?.notes
            ? <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 6 }}>
                <p style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{client.notes}</p>
                <button onClick={f('Internal Notes', 'notes', client.notes, 'textarea', { placeholder: 'Team notes…' })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, opacity: 0.4, flexShrink: 0, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.4}>
                  <Pencil size={11} />
                </button>
              </div>
            : <InfoRow label="Notes" value={null} onEdit={f('Internal Notes', 'notes', '', 'textarea', { placeholder: 'Team notes about this client…' })} />
          }
        </SectionCard>
      </div>
    </div>
  );
}

/* ─── AI Profile Tab ─────────────────────────────────────────────────────── */
function AIProfileTab({ clientId, client, onGoToKeywords }) {
  const queryClient = useQueryClient();
  const [loading, setLoading]               = useState(false);
  const [openAccordions, setOpenAccordions]  = useState(new Set([0]));
  const [error, setError]                   = useState(null);
  const [regenLoading, setRegenLoading]     = useState({});

  // Initialise from stored JSON — survives tab switches
  const storedProfile = (() => {
    try { return client?.gbp_ai_profile ? JSON.parse(client.gbp_ai_profile) : null; } catch { return null; }
  })();
  const [aiResult, setAiResult] = useState(storedProfile);

  const { data: kwData, isLoading: kwLoading } = useQuery({
    queryKey: ['keywords', clientId],
    queryFn:  () => api.get(`/keywords/${clientId}`).then(r => r.data),
    enabled:  !!clientId,
    staleTime: 30_000,
  });

  const selectedKwCount = kwData?.selected_count ?? 0;
  const hasStoredAI     = !!client?.gbp_description_ai;
  const r               = aiResult;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res    = await api.post(`/ai/generate-profile/${clientId}`);
      const result = res.data.result;
      setAiResult(result);
      if (result.suggested_services_by_category?.length) {
        setOpenAccordions(new Set([0]));
      }
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    } catch (err) {
      const code = err.response?.data?.code;
      setError({ type: code === 'NO_KEYWORDS' ? 'no_keywords' : 'general', message: err.response?.data?.message || err.response?.data?.error || 'Generation failed — please try again.' });
    } finally { setLoading(false); }
  }

  async function regenSection(section) {
    setRegenLoading(prev => ({ ...prev, [section]: true }));
    try {
      const res    = await api.post(`/ai/regenerate-section/${clientId}`, { section });
      const result = res.data.result;
      setAiResult(prev => ({ ...prev, ...result }));
      if (section === 'services_by_category' && result.suggested_services_by_category?.length) {
        setOpenAccordions(new Set([0]));
      }
    } catch (err) {
      /* silently fail — user can retry */
    } finally {
      setRegenLoading(prev => ({ ...prev, [section]: false }));
    }
  }

  function toggleAccordion(idx) {
    setOpenAccordions(prev => prev.has(idx) ? new Set() : new Set([idx]));
  }

  function RegenBtn({ section }) {
    const busy = !!regenLoading[section];
    return (
      <button
        onClick={() => regenSection(section)}
        disabled={busy}
        title="Regenerate this section"
        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: busy ? 'default' : 'pointer', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 11, transition: 'all 0.15s' }}
        onMouseEnter={e => { if (!busy) e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        <RefreshCw size={11} style={{ animation: busy ? 'spin 1s linear infinite' : 'none' }} />
        {busy ? 'Regenerating…' : 'Regenerate'}
      </button>
    );
  }

  function CopyField({ label, text, multiline = false, section }) {
    if (!text) return null;
    return (
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: multiline ? 10 : 8, gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {section && r && <RegenBtn section={section} />}
            <CopyBtn text={text} />
          </div>
        </div>
        {multiline
          ? <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.75 }}>{text}</p>
          : <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{text}</div>
        }
      </div>
    );
  }

  function ChipsField({ label, items }) {
    const [copiedIdx, setCopiedIdx] = useState(null);
    if (!items?.length) return null;

    function copyChip(text, idx) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 1400);
      });
    }

    return (
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((item, i) => (
            <span key={i} onClick={() => copyChip(item, i)} title="Click to copy"
              style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: copiedIdx === i ? 'var(--green-light)' : 'var(--accent-light)', border: `1px solid ${copiedIdx === i ? 'rgba(74,222,128,0.4)' : 'hsla(219,74%,53%,0.2)'}`, color: copiedIdx === i ? 'var(--green-text)' : 'var(--accent-text)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' }}>
              {copiedIdx === i ? '✓ Copied' : item}
            </span>
          ))}
        </div>
      </div>
    );
  }

  /* No keywords gate */
  if (!kwLoading && selectedKwCount === 0) {
    return (
      <div className="card" style={{ padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--yellow-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Tag size={22} style={{ color: 'var(--yellow-text)' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>Keywords Required</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360, lineHeight: 1.65 }}>
            AI Profile uses your selected keywords to write accurate, SEO-optimised content. Please generate and select keywords first.
          </div>
        </div>
        <button className="btn-primary" onClick={onGoToKeywords} style={{ gap: 8 }}>
          <Tag size={14} /> Go to Keywords Tab
        </button>
      </div>
    );
  }

  const servicesByCategory  = r?.suggested_services_by_category ?? [];
  const secondaryCategories = r?.suggested_categories_secondary ?? [];
  const serviceArea         = r?.suggested_service_area ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18, color: 'var(--text-primary)', marginBottom: 6 }}>GBP Profile Optimization</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            {r ? 'AI profile generated. Copy each field into your Google Business Profile. Use individual Regenerate buttons for specific sections.' : 'Generate AI-optimised GBP content based on your selected keywords and business details.'}
          </div>
          {error?.type === 'general' && (
            <div style={{ fontSize: 12, color: 'var(--red-text)', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
              <AlertCircle size={12} /> {error.message}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={generate} disabled={loading || kwLoading} style={{ gap: 8 }}>
              {loading ? <><Loader2 size={14} className="spin" /> Generating…</> : <><Sparkles size={14} /> {r || hasStoredAI ? 'Regenerate All' : 'Generate AI Profile'}</>}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedKwCount} keyword{selectedKwCount !== 1 ? 's' : ''} selected</span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Loader2 size={32} className="spin" style={{ color: 'var(--accent-text)', margin: '0 auto 14px', display: 'block' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Generating AI Profile…</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Claude is analysing your business details and {selectedKwCount} selected keywords. This takes 15–30 seconds.</div>
        </div>
      )}

      {r && !loading && (
        <>
          {/* Business identity fields — 70/30 on tablet+, stacked on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }} className="ai-70-30">
            <CopyField label="Business SEO Name" text={r.suggested_business_name} section="business_name" />
            <CopyField label="Business Primary Category" text={r.suggested_category_primary} />
          </div>

          <ChipsField
            label={`Business Secondary Categories (${secondaryCategories.length})`}
            items={secondaryCategories}
          />

          <CopyField label="Business Description" text={r.suggested_description} multiline section="description" />

          {serviceArea.length > 0 && (
            <ChipsField label="Service Area" items={serviceArea} />
          )}

          {/* Services by Category — accordions */}
          {servicesByCategory.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>Services by Category</span>
              </div>
              {regenLoading['services_by_category'] ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Loader2 size={18} className="spin" style={{ color: 'var(--accent-text)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Regenerating services…</span>
                </div>
              ) : (
                servicesByCategory.map((cat, idx) => {
                  const isOpen   = openAccordions.has(idx);
                  const copyText = cat.services?.map(s => `${s.name}: ${s.description}`).join('\n\n') ?? '';
                  return (
                    <div key={idx} style={{ borderBottom: idx < servicesByCategory.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <button
                        onClick={() => toggleAccordion(idx)}
                        style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 10, background: isOpen ? 'hsla(219,74%,53%,0.03)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.category}</span>
                        {cat.is_primary && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-light)', color: 'var(--accent-text)', border: '1px solid hsla(219,74%,53%,0.2)', flexShrink: 0 }}>Primary</span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginRight: 4 }}>{cat.services?.length ?? 0} services</span>
                        {copyText && (
                          <span onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                            <CopyBtn text={copyText} />
                          </span>
                        )}
                      </button>
                      {isOpen && cat.services?.length > 0 && (
                        <div style={{ padding: '0 20px 12px', background: 'hsla(219,74%,53%,0.02)' }}>
                          {cat.services.map((svc, si) => (
                            <div key={si} style={{ padding: '10px 0', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{svc.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{svc.description}</div>
                              </div>
                              <CopyBtn text={`${svc.name}: ${svc.description}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Posts Tab ──────────────────────────────────────────────────────────── */
const POST_HEADER_COLOR = {
  offer:   '#D97706',
  update:  '#2563EB',
  event:   '#059669',
  product: '#7C3AED',
};

function EditPostModal({ post: initialPost, onClose, onSaved, onDeleted }) {
  const [post, setPost]           = useState(initialPost);
  const [editTitle, setEditTitle] = useState(initialPost.title || '');
  const [editContent, setEditContent] = useState(initialPost.content || '');
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [genImgLoading, setGenImgLoading] = useState(false);
  const [imgError, setImgError]   = useState(null);

  let keywordsUsed = [], whyPost = '';
  if (post.notes) {
    try {
      const n = JSON.parse(post.notes);
      keywordsUsed = n.keywords_used ?? [];
      whyPost      = n.why_post ?? '';
    } catch { /* plain text */ }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await api.put(`/posts/${post.id}`, { title: editTitle, content: editContent });
      onSaved(res.data.post);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/posts/${post.id}`);
      onDeleted?.();
    } catch { /* ignore */ } finally { setDeleting(false); }
  }

  async function handleGenerateImage() {
    if (!post.image_prompt) return;
    setGenImgLoading(true);
    setImgError(null);
    try {
      const imgRes = await api.post('/posts/generate/image', { prompt: post.image_prompt });
      const putRes = await api.put(`/posts/${post.id}`, { image_url: imgRes.data.imageUrl });
      setPost(putRes.data.post);
    } catch (err) {
      setImgError(err.response?.data?.error || 'Image generation failed — check OpenAI billing.');
    } finally { setGenImgLoading(false); }
  }

  function downloadImage() {
    const url = post.image_url;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = `post-${post.id}.png`; a.target = '_blank'; a.click();
  }

  return (
    <Portal>
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: 12 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: '100%', maxWidth: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Edit Post</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Image */}
          {post.image_url ? (
            <div style={{ borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
              <img src={post.image_url} alt="Post" style={{ width: '100%', aspectRatio: '732/305', display: 'block', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                <button onClick={downloadImage} style={{ background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Download size={11} /> Download
                </button>
                {post.image_prompt && (
                  <button onClick={handleGenerateImage} disabled={genImgLoading} style={{ background: 'rgba(37,99,235,0.85)', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {genImgLoading ? <><Loader2 size={11} className="spin" /> Generating…</> : <><RefreshCw size={11} /> Regenerate</>}
                  </button>
                )}
              </div>
            </div>
          ) : post.image_prompt ? (
            <div style={{ background: 'var(--bg-input)', border: '1.5px dashed var(--border)', borderRadius: 10, padding: '28px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Image size={28} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No image generated yet</div>
              {imgError && <div style={{ fontSize: 12, color: 'var(--red-text)', background: 'var(--red-light)', padding: '6px 12px', borderRadius: 6 }}>{imgError}</div>}
              <button onClick={handleGenerateImage} disabled={genImgLoading} style={{ background: 'var(--accent-light)', border: '1px solid hsla(219,74%,53%,0.3)', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 12, color: 'var(--accent-text)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                {genImgLoading ? <><Loader2 size={13} className="spin" /> Generating image…</> : <><Image size={13} /> Generate Image</>}
              </button>
            </div>
          ) : null}

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Post Heading</label>
            <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Post heading" />
          </div>

          {/* Content */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Post Content</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: editContent.length < 600 ? 'var(--yellow-text)' : 'var(--green-text)' }}>{editContent.length} chars</span>
                <CopyBtn text={`${editTitle}\n\n${editContent}`} />
              </div>
            </div>
            <textarea className="input" value={editContent} onChange={e => setEditContent(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 150, resize: 'vertical', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6 }}
              placeholder="Post content…" />
          </div>

          {/* Why post + keywords */}
          {(keywordsUsed.length > 0 || whyPost) && (
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {keywordsUsed.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Targeted Keywords</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {keywordsUsed.map(kw => <span key={kw} style={{ fontSize: 11, color: 'var(--accent-text)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 20, border: '1px solid hsla(219,74%,53%,0.2)' }}>{kw}</span>)}
                  </div>
                </div>
              )}
              {whyPost && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Why Post This</div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>{whyPost}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={handleDelete} disabled={deleting} style={{ height: 38, padding: '0 14px', background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, cursor: 'pointer', color: 'var(--red-text)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            {deleting ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />}
          </button>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving} style={{ flex: 1, gap: 6 }}>
            {saving ? <><Loader2 size={12} className="spin" /> Saving…</> : <><Check size={12} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

function PostCard({ post: initialPost, onUpdate, onDelete }) {
  const [post, setPost]           = useState(initialPost);
  const [showEdit, setShowEdit]   = useState(false);
  const [approving, setApproving] = useState(false);
  const [genImgLoading, setGenImgLoading] = useState(false);
  const [lightbox, setLightbox]   = useState(false);

  const isApproved = post.status === 'published';
  const headerBg   = POST_HEADER_COLOR[post.post_type] || POST_HEADER_COLOR.update;
  const typeLabel  = post.post_type ? post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1) : 'Update';

  const scheduledStr = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) +
      ', ' + new Date(post.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  function applyUpdate(updated) { setPost(updated); onUpdate?.(updated); }

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await api.put(`/posts/${post.id}`, { status: 'published' });
      applyUpdate(res.data.post);
    } catch { /* ignore */ } finally { setApproving(false); }
  }

  async function handleGenerateImage() {
    if (!post.image_prompt) return;
    setGenImgLoading(true);
    try {
      const imgRes = await api.post('/posts/generate/image', { prompt: post.image_prompt });
      const putRes = await api.put(`/posts/${post.id}`, { image_url: imgRes.data.imageUrl });
      applyUpdate(putRes.data.post);
    } catch { /* ignore */ } finally { setGenImgLoading(false); }
  }

  function downloadImage() {
    if (!post.image_url) return;
    const a = document.createElement('a');
    a.href = post.image_url; a.download = `post-${post.id}.png`; a.target = '_blank'; a.click();
  }

  return (
    <>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>

        {/* Image with overlays */}
        {post.image_url ? (
          <div style={{ position: 'relative', aspectRatio: '732/305', overflow: 'hidden' }}>
            <img src={post.image_url} alt="Post" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
            {/* Type chip — top left */}
            <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: headerBg, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{typeLabel}</span>
            {/* Status badge — top right */}
            <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, letterSpacing: '0.04em',
              background: isApproved ? 'rgba(74,222,128,0.85)' : 'rgba(0,0,0,0.55)',
              color: isApproved ? '#052e16' : '#fff',
              border: isApproved ? 'none' : '1px solid rgba(255,255,255,0.25)',
            }}>{isApproved ? '✓ Approved' : 'Pending'}</span>
            {/* Expand lightbox — bottom left */}
            <button onClick={() => setLightbox(true)} style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
              <Maximize2 size={12} />
            </button>
            {/* Download — bottom right */}
            <button onClick={downloadImage} style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={11} /> Download
            </button>
          </div>
        ) : post.image_prompt ? (
          <div style={{ aspectRatio: '732/305', background: 'var(--bg-input)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: headerBg, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{typeLabel}</span>
            <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(0,0,0,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>{isApproved ? '✓ Approved' : 'Pending'}</span>
            {genImgLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Loader2 size={22} className="spin" style={{ color: 'var(--accent-text)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Generating image…</span>
              </div>
            ) : (
              <button onClick={handleGenerateImage} style={{ background: 'var(--accent-light)', border: '1px solid hsla(219,74%,53%,0.3)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Image size={13} /> Generate Image
              </button>
            )}
          </div>
        ) : null}

        {/* Body */}
        <div style={{ padding: '12px 16px', flex: 1 }}>
          {scheduledStr && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
              <CalendarDays size={11} /> {scheduledStr}
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 6 }}>{post.title || '(No heading)'}</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {post.content}
          </p>
        </div>

        {/* Footer — 2 buttons */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={() => setShowEdit(true)}
            style={{ height: 38, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <Pencil size={12} /> Edit
          </button>
          <button onClick={handleApprove} disabled={approving || isApproved}
            style={{ height: 38, background: isApproved ? 'var(--green-light)' : '#2563EB', border: isApproved ? '1px solid rgba(74,222,128,0.3)' : 'none', borderRadius: 8, cursor: isApproved ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, color: isApproved ? 'var(--green-text)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {approving ? <><Loader2 size={12} className="spin" /> Approving…</> : isApproved ? <><CheckCircle2 size={12} /> Approved</> : <><CheckCircle2 size={12} /> Approve</>}
          </button>
        </div>
      </div>

      {showEdit && (
        <EditPostModal
          post={post}
          onClose={() => setShowEdit(false)}
          onSaved={updated => { applyUpdate(updated); setShowEdit(false); }}
          onDeleted={() => { setShowEdit(false); onDelete?.(post.id); }}
        />
      )}

      {/* Lightbox */}
      {lightbox && post.image_url && (
        <Portal>
          <div onClick={() => setLightbox(false)} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}>
            <img src={post.image_url} alt="Post" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 10, objectFit: 'contain', cursor: 'default' }} onClick={e => e.stopPropagation()} />
            <button onClick={() => setLightbox(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 50, width: 36, height: 36, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>
        </Portal>
      )}
    </>
  );
}

function PostsTab({ clientId }) {
  const [month, setMonth]           = useState(new Date().getMonth() + 1);
  const [year, setYear]             = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState(null);
  const qc = useQueryClient();

  const { data: postsData, refetch } = useQuery({
    queryKey: ['posts', clientId, month, year],
    queryFn:  () => api.get(`/posts?client_id=${clientId}&month=${month}&year=${year}&limit=100`).then(r => r.data),
    enabled:  !!clientId,
    staleTime: 0,
  });

  const posts = postsData?.posts ?? postsData ?? [];

  function updatePost(updated) {
    qc.setQueryData(['posts', clientId, month, year], old => {
      const list = old?.posts ?? old ?? [];
      const next = list.map(p => p.id === updated.id ? updated : p);
      return old?.posts ? { ...old, posts: next } : next;
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      await api.post(`/ai/generate-posts/${clientId}`, { month, year });
      await refetch();
    } catch (err) {
      setGenError(err.response?.data?.error || 'Generation failed — please try again.');
    } finally { setGenerating(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ minWidth: 140 }}>
            <label className="label">Month</label>
            <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 100 }}>
            <label className="label">Year</label>
            <select className="input" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={handleGenerate} disabled={generating} style={{ height: 38, gap: 8 }}>
            {generating ? <><Loader2 size={13} className="spin" /> Generating…</> : <><Sparkles size={13} /> {posts.length > 0 ? 'Regenerate Posts' : 'Generate 10 Posts'}</>}
          </button>
          {posts.length > 0 && !generating && (
            <button className="btn-ghost" onClick={() => {
              const content = posts.map((p, i) =>
                `POST #${i+1} — ${(p.post_type||'UPDATE').toUpperCase()}\nHeading: ${p.title||''}\nDate: ${p.scheduled_at||'—'}\n\n${p.content||''}\n${'─'.repeat(60)}`
              ).join('\n\n');
              downloadTXT(`posts-${MONTHS[month-1]}-${year}.txt`,
                `Posts for ${MONTHS[month-1]} ${year}\nGenerated: ${new Date().toLocaleString('en-IN')}\n${'═'.repeat(60)}\n\n${content}`);
            }} style={{ height: 38, gap: 6 }}>
              <Download size={13} /> Export
            </button>
          )}
        </div>
        {genError && (
          <div style={{ marginTop: 12, padding: '8px 14px', background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--red-text)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={13} /> {genError}
          </div>
        )}
        {posts.length > 0 && !generating && (
          <div style={{ marginTop: 12, padding: '8px 14px', background: 'var(--green-light)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--green-text)', fontWeight: 500 }}>✓ {posts.length} posts for {MONTHS[month-1]} {year}</span>
          </div>
        )}
      </div>

      {/* Skeletons while generating */}
      {generating && (
        <div className="rg-posts">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="skeleton" style={{ height: 100, borderRadius: '12px 12px 0 0' }} />
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 12, width: '100%', borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!generating && posts.length === 0 && (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <FileText size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>No posts yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Select a month and year, then click Generate to create 10 AI-crafted posts.</div>
          <button className="btn-primary" onClick={handleGenerate} style={{ gap: 7 }}>
            <Sparkles size={13} /> Generate 10 Posts
          </button>
        </div>
      )}

      {/* Post cards grid */}
      {!generating && posts.length > 0 && (
        <div className="rg-posts">
          {posts.map(post => <PostCard key={post.id} post={post} onUpdate={updatePost} onDelete={id => {
            qc.setQueryData(['posts', clientId, month, year], old => {
              const list = old?.posts ?? old ?? [];
              const next = list.filter(p => p.id !== id);
              return old?.posts ? { ...old, posts: next } : next;
            });
          }} />)}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Reviews Tab ────────────────────────────────────────────────────────── */
function StarRating({ rating, onChange, size = 24 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)} onMouseEnter={() => onChange && setHover(i)} onMouseLeave={() => onChange && setHover(0)} style={{ background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default', padding: 1 }}>
          <Star size={size} style={{ color: i <= (hover || rating) ? 'var(--yellow-text)' : 'var(--border)', fill: i <= (hover || rating) ? 'var(--yellow-text)' : 'transparent', transition: 'all 0.1s' }} />
        </button>
      ))}
    </div>
  );
}

function ReplyCard({ title, text, accent }) {
  return (
    <div className="card" style={{ padding: '14px 16px', ...(accent ? { border: '1px solid hsla(219,74%,53%,0.3)', background: 'var(--accent-light)' } : {}) }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: accent ? 'var(--accent-text)' : 'var(--text-muted)' }}>{title}</span>
        <CopyBtn text={text} />
      </div>
      <p style={{ fontSize: 13, color: accent ? 'var(--accent-text)' : 'var(--text-secondary)', lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}

function ReviewsTab({ clientId }) {
  const [mode, setMode]       = useState('no_feedback'); // 'no_feedback' | 'with_feedback'
  const [rating, setRating]   = useState(5);
  const [feedback, setFeedback] = useState('');
  const [tone, setTone]       = useState('professional');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [genError, setGenError] = useState(null);


  async function generateReply() {
    setLoading(true);
    setResult(null);
    setGenError(null);
    try {
      const body = {
        star_rating:     rating,
        review_text:     mode === 'with_feedback' ? feedback : '',
        tone,
        include_keyword: instructions,
        client_id:       clientId,
      };
      const res = await api.post('/ai/review-reply', body);
      setResult(res.data.result);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Generation failed — please try again.';
      setGenError(msg);
    } finally { setLoading(false); }
  }

  const canGenerate = !loading && (mode === 'no_feedback' || feedback.trim().length > 0);

  return (
    <div className="review-layout" style={{ alignItems: 'start' }}>

      {/* ── Form card ── */}
      <div className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Radio: No feedback / With feedback */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 10 }}>Review Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { val: 'no_feedback',   label: 'No Feedback',   desc: 'Star rating only' },
              { val: 'with_feedback', label: 'With Feedback', desc: 'Stars + review text' },
            ].map(opt => (
              <label key={opt.val} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${mode === opt.val ? 'hsla(219,74%,53%,0.5)' : 'var(--border)'}`, background: mode === opt.val ? 'var(--accent-light)' : 'var(--bg-input)', cursor: 'pointer', transition: 'all 0.15s' }}>
                <input type="radio" name="review_mode" value={opt.val} checked={mode === opt.val} onChange={() => { setMode(opt.val); setResult(null); setGenError(null); }} style={{ display: 'none' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: mode === opt.val ? 'var(--accent-text)' : 'var(--text-primary)' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Star rating */}
        <div className="field">
          <label className="label">Star Rating</label>
          <div style={{ marginTop: 8 }}>
            <StarRating rating={rating} onChange={setRating} />
          </div>
        </div>

        {/* Feedback text — only when "with_feedback" */}
        {mode === 'with_feedback' && (
          <div className="field">
            <label className="label">Customer Feedback</label>
            <textarea
              className="input"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Paste the customer's review text here…"
              style={{ marginTop: 4, height: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
            />
          </div>
        )}

        {/* Response tone — 2×2 grid */}
        <div className="field">
          <label className="label">Response Tone</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            {TONE_OPTIONS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTone(t.value)}
                style={{ padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${tone === t.value ? 'hsla(219,74%,53%,0.5)' : 'var(--border)'}`, background: tone === t.value ? 'var(--accent-light)' : 'var(--bg-input)', color: tone === t.value ? 'var(--accent-text)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s', textAlign: 'center' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Instructions — optional */}
        <div className="field">
          <label className="label">Instructions <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <textarea
            className="input"
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Any specific instructions for the reply…"
            style={{ marginTop: 4, height: 72, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
          />
        </div>

        {/* Generate button */}
        <button
          className="btn-primary"
          onClick={generateReply}
          disabled={!canGenerate}
          style={{ height: 44, gap: 8, fontSize: 14 }}
        >
          {loading
            ? <><Loader2 size={14} className="spin" /> Generating…</>
            : <><Sparkles size={14} /> Generate Reply</>
          }
        </button>
      </div>

      {/* ── Right column: Result panel ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {!result && !loading && !genError && (
        <div style={{ padding: '40px 24px', textAlign: 'center', border: '1.5px dashed var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={20} style={{ color: 'var(--accent-text)' }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>AI Reply Generator</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fill in the form above and click Generate Reply</div>
        </div>
      )}

      {loading && (
        <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={32} className="spin" style={{ color: 'var(--accent-text)' }} />
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Crafting the perfect reply…</div>
        </div>
      )}

      {genError && !loading && (
        <div style={{ padding: '12px 16px', background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--red-text)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} /> {genError}
        </div>
      )}

      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ReplyCard title="Full Reply (Recommended)" text={result.full_reply} accent />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            <ReplyCard title="Short Reply" text={result.short_reply} />
            <ReplyCard title="Professional" text={result.professional_version} />
          </div>
          <ReplyCard title="Warm & Friendly" text={result.warm_version} />
          <button className="btn-ghost" onClick={generateReply} style={{ height: 36, gap: 6, width: 'fit-content' }}>
            <RefreshCw size={13} /> Regenerate
          </button>
        </div>
      )}

      </div>{/* end right column */}
    </div>
  );
}

/* ─── Keywords Tab ───────────────────────────────────────────────────────── */
function KeywordsTab({ clientId }) {
  const queryClient  = useQueryClient();
  const [mode,       setMode]       = useState('view');
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState(null);
  const [selected,   setSelected]   = useState(new Set());
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [addingManual, setAddingManual] = useState(false);
  const [deletingId,   setDeletingId]  = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['keywords', clientId],
    queryFn:  () => api.get(`/keywords/${clientId}`).then(r => r.data),
    enabled:  !!clientId,
    staleTime: 30_000,
  });

  const allKeywords   = data?.keywords ?? [];
  const aiKeywords    = allKeywords.filter(k => k.source !== 'manual');
  const manualKeywords = allKeywords.filter(k => k.source === 'manual');
  const selectedCount = data?.selected_count ?? 0;

  const viewAI     = mode === 'view' ? aiKeywords.filter(k => k.selected)     : aiKeywords;
  const viewManual = mode === 'view' ? manualKeywords.filter(k => k.selected) : manualKeywords;
  const allChecked = allKeywords.length > 0 && selected.size === allKeywords.length;

  function enterManage() {
    setSelected(new Set(allKeywords.filter(k => k.selected).map(k => k.id)));
    setMode('manage');
  }
  function toggleKeyword(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(allKeywords.map(k => k.id)));
  }
  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleGenerate() {
    setGenerating(true); setGenError(null);
    try {
      await api.post(`/keywords/${clientId}/generate`);
      const result = await refetch();
      const kws = result.data?.keywords ?? [];
      setSelected(new Set(kws.filter(k => k.priority === 'high').map(k => k.id)));
      setMode('manage');
    } catch (err) {
      setGenError(err.response?.data?.error || 'Generation failed — please try again.');
    } finally { setGenerating(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.post(`/keywords/${clientId}/select`, { ids: [...selected] });
      await refetch();
      setMode('view');
      showToast(`${res.data.selected_count} keyword${res.data.selected_count !== 1 ? 's' : ''} saved successfully`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save selection', 'error');
    } finally { setSaving(false); }
  }

  async function handleAddManual(e) {
    e?.preventDefault();
    const kw = manualInput.trim();
    if (!kw) return;
    setAddingManual(true);
    try {
      await api.post(`/keywords/${clientId}`, { keyword: kw });
      await refetch();
      setManualInput('');
      showToast(`"${kw}" added`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add keyword', 'error');
    } finally { setAddingManual(false); }
  }

  async function handleDeleteManual(id, keyword) {
    setDeletingId(id);
    try {
      await api.delete(`/keywords/${id}`);
      await refetch();
      showToast(`"${keyword}" removed`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error');
    } finally { setDeletingId(null); }
  }

  const intentColor = {
    local: 'var(--green-text)', location: 'var(--green-text)', near_me: 'var(--green-text)',
    commercial: 'var(--yellow-text)', product: 'var(--yellow-text)',
    service: 'var(--accent-text)', navigational: 'var(--accent-text)', branded: 'var(--accent-text)',
    informational: 'var(--text-secondary)', emergency: 'var(--red-text)',
  };

  const COL_VIEW   = '1fr 110px 100px';
  const COL_MANAGE = '36px 1fr 110px 100px';
  const cols = mode === 'manage' ? COL_MANAGE : COL_VIEW;

  function KeywordRow({ k, isManual }) {
    const isChecked = selected.has(k.id);
    return (
      <div
        key={k.id}
        onClick={mode === 'manage' ? () => toggleKeyword(k.id) : undefined}
        style={{
          display: 'grid',
          gridTemplateColumns: isManual
            ? (mode === 'manage' ? '36px 1fr 32px' : '1fr 32px')
            : cols,
          gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border)',
          alignItems: 'center',
          cursor: mode === 'manage' ? 'pointer' : 'default',
          background: mode === 'manage' && isChecked ? 'hsla(219,74%,53%,0.04)' : 'transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (mode === 'manage') e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = mode === 'manage' && isChecked ? 'hsla(219,74%,53%,0.04)' : 'transparent'; }}
      >
        {mode === 'manage' && (
          <input type="checkbox" checked={isChecked} onChange={() => toggleKeyword(k.id)}
            onClick={e => e.stopPropagation()}
            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }} />
        )}
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{k.keyword}</span>
          {k.ai_reason && mode === 'manage' && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{k.ai_reason}</div>
          )}
        </div>
        {!isManual && (
          <>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: intentColor[k.intent] || 'var(--text-muted)', textTransform: 'capitalize' }}>
                {k.intent?.replace(/_/g, ' ') || '—'}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {k.difficulty || '—'}
              </span>
            </div>
          </>
        )}
        {isManual && (
          <button
            onClick={e => { e.stopPropagation(); handleDeleteManual(k.id, k.keyword); }}
            disabled={deletingId === k.id}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 5, display: 'flex', transition: 'color 0.12s', opacity: deletingId === k.id ? 0.4 : 1 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red-text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Delete keyword"
          >
            {deletingId === k.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 500,
          padding: '12px 20px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-card)', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.35)'}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)', color: toast.type === 'error' ? 'var(--red-text)' : 'var(--green-text)',
          fontSize: 13, fontWeight: 600,
        }}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Control bar */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {mode === 'view' ? (
          <>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>
              {isLoading ? 'Loading keywords…'
                : selectedCount > 0 ? `${selectedCount} keyword${selectedCount !== 1 ? 's' : ''} selected`
                : allKeywords.length > 0 ? `${allKeywords.length} keywords — none selected`
                : 'No keywords yet'}
            </span>
            {allKeywords.length > 0 && (
              <button className="btn-ghost" onClick={enterManage} style={{ height: 36, gap: 6, fontSize: 13 }}>Manage</button>
            )}
            <button className="btn-primary" onClick={handleGenerate} disabled={generating || isLoading} style={{ gap: 7, height: 36 }}>
              {generating ? <><Loader2 size={13} className="spin" /> Generating…</> : <><Sparkles size={13} /> {allKeywords.length ? 'Regenerate' : 'Generate 50 Keywords'}</>}
            </button>
            <button className="btn-ghost" style={{ height: 36, gap: 6 }} disabled={allKeywords.length === 0}
              onClick={() => downloadCSV(`keywords-${clientId}.csv`,
                [{ key: 'keyword', label: 'Keyword' }, { key: 'intent', label: 'Intent' }, { key: 'difficulty', label: 'Competition' }, { key: 'source', label: 'Source' }],
                allKeywords)}>
              <Download size={13} /> Export
            </button>
          </>
        ) : (
          <>
            <input type="checkbox" checked={allChecked} onChange={toggleAll}
              style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{selected.size} of {allKeywords.length} selected</span>
            <button className="btn-ghost" onClick={() => setMode('view')} style={{ height: 36, fontSize: 13 }} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 7, height: 36 }}>
              {saving ? <><Loader2 size={13} className="spin" /> Saving…</> : <><Check size={13} /> Save Selected ({selected.size})</>}
            </button>
          </>
        )}
      </div>

      {/* Manual keyword input */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Add Manual Keyword
        </div>
        <form onSubmit={handleAddManual} style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            placeholder="e.g. dental clinic near me"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            style={{ flex: 1, height: 38, fontSize: 13 }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={!manualInput.trim() || addingManual}
            style={{ height: 38, paddingLeft: 20, paddingRight: 20, gap: 6, flexShrink: 0 }}
          >
            {addingManual ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
            Add
          </button>
        </form>
      </div>

      {genError && (
        <div style={{ padding: '10px 16px', background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--red-text)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} /> {genError}
        </div>
      )}

      {generating ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Loader2 size={32} className="spin" style={{ color: 'var(--accent-text)', margin: '0 auto 14px', display: 'block' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Claude is generating 50 keywords…</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Analysing business category, location & services. This takes 15–30 seconds.</div>
        </div>
      ) : isLoading ? (
        <div className="card">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ margin: '10px 20px', height: 36, borderRadius: 6 }} />)}</div>
      ) : (
        <>
          {/* Manual Keywords section */}
          {(mode === 'manage' || viewManual.length > 0) && (
            <div className="card">
              <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Manual Keywords</span>
                <span style={{ fontSize: 11, background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 20, padding: '1px 8px' }}>
                  {manualKeywords.length}
                </span>
              </div>
              {viewManual.length === 0 ? (
                <div style={{ padding: '20px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>No manual keywords added yet</div>
              ) : (
                viewManual.map(k => <KeywordRow key={k.id} k={k} isManual />)
              )}
            </div>
          )}

          {/* AI Keywords section */}
          {viewAI.length === 0 && !generating ? (
            <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <Tag size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {mode === 'view' && aiKeywords.length > 0 ? 'No AI keywords selected yet' : 'No AI keywords generated yet'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                {mode === 'view' && aiKeywords.length > 0
                  ? 'Click "Manage" to select keywords to track.'
                  : 'Click "Generate 50 Keywords" to create an AI-powered keyword set.'}
              </div>
              {(mode !== 'view' || aiKeywords.length === 0) && (
                <button className="btn-primary" onClick={handleGenerate} style={{ gap: 7 }}>
                  <Sparkles size={13} /> Generate 50 Keywords
                </button>
              )}
            </div>
          ) : viewAI.length > 0 && (
            <div className="card">
              <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Generated Keywords</span>
                <span style={{ fontSize: 11, background: 'var(--accent-light)', color: 'var(--accent-text)', border: '1px solid hsla(219,74%,53%,0.2)', borderRadius: 20, padding: '1px 8px' }}>
                  {aiKeywords.filter(k => k.selected).length}
                </span>
              </div>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '8px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', alignItems: 'center' }}>
                {mode === 'manage' && <div />}
                <div>Keyword</div>
                <div style={{ textAlign: 'center' }}>Intent</div>
                <div style={{ textAlign: 'center' }}>Competition</div>
              </div>
              {viewAI.map(k => <KeywordRow key={k.id} k={k} isManual={false} />)}
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Record Payment Modal ───────────────────────────────────────────────── */
function RecordPaymentModal({ clientId, defaultAmount, billing, totalEarned = 0, onClose, onSaved }) {
  const { isMobile } = useBreakpoint();
  const [amount, setAmount]   = useState(defaultAmount || '');
  const [method, setMethod]   = useState('bank_transfer');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const nextMonthDefault = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [nextDueDate, setNextDueDate] = useState(
    billing?.next_due_date || nextMonthDefault
  );

  const MULT      = { monthly: 1, quarterly: 3, annually: 12 };
  const mult      = MULT[billing?.billing_cycle] || 1;
  const autoTotal = (Number(billing?.monthly_amount) || 0) * mult;
  const planTotal = Number(billing?.plan_total) > 0 ? Number(billing.plan_total) : autoTotal;
  const pending   = planTotal > 0 ? Math.max(0, planTotal - totalEarned) : null;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post(`/billing/${clientId}/payments`, {
        amount: parseFloat(amount),
        payment_date: today,
        payment_method: method,
        reference_no: note || undefined,
      });
      if (nextDueDate) {
        await api.put(`/billing/${clientId}`, { next_due_date: nextDueDate, payment_status: 'paid' });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment');
    } finally { setLoading(false); }
  }

  return (
    <Portal>
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: isMobile ? '16px 16px 0 0' : 16, width: '100%', maxWidth: isMobile ? '100%' : 440 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Record Payment</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red-text)', borderRadius: 8, fontSize: 13 }}>{error}</div>}

          {/* Pending balance banner */}
          {pending !== null && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: pending === 0 ? 'var(--green-light)' : 'var(--yellow-light)', borderRadius: 10, border: `1px solid ${pending === 0 ? 'rgba(22,163,74,0.2)' : 'rgba(180,83,9,0.2)'}` }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: pending === 0 ? 'var(--green-text)' : 'var(--yellow-text)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {pending === 0 ? 'Fully Paid' : 'Pending Balance'}
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 700, color: pending === 0 ? 'var(--green-text)' : 'var(--yellow-text)', marginTop: 2 }}>
                  {pending === 0 ? '₹0' : `₹${pending.toLocaleString('en-IN')}`}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                <div>Plan Total: ₹{planTotal.toLocaleString('en-IN')}</div>
                <div>Received: ₹{totalEarned.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} required style={{ fontFamily: 'DM Mono, monospace' }} />
            </div>
            <div className="field">
              <label className="label">Payment Method</label>
              <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label className="label">Next Payment Date</label>
            <input className="input" type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)}
              style={{ fontFamily: 'DM Mono, monospace', colorScheme: 'dark' }} />
          </div>

          <div className="field">
            <label className="label">Reference / Notes (optional)</label>
            <textarea className="input" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Reference number, transaction ID, notes…"
              style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 2, gap: 7 }} disabled={loading}>
              {loading ? <><Loader2 size={14} className="spin" /> Saving…</> : <><Check size={13} /> Record Payment</>}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}

/* ─── Billing Edit Modal ─────────────────────────────────────────────────── */
function BillingEditModal({ clientId, billing, onClose, onSaved }) {
  const [form, setForm] = useState({
    plan_name:      billing?.plan_name      ?? 'Free',
    monthly_amount: billing?.monthly_amount ?? '',
    plan_total:     billing?.plan_total     ?? '',
    billing_cycle:  billing?.billing_cycle  ?? 'monthly',
    start_date:     billing?.start_date     ?? '',
    plan_end_date:  billing?.plan_end_date  ?? '',
    next_due_date:  billing?.next_due_date  ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isPaid = form.plan_name === 'Pro' || form.plan_name === 'Premium';

  async function save() {
    setSaving(true); setError(null);
    try {
      await api.put(`/billing/${clientId}`, {
        ...form,
        monthly_amount: isPaid && form.monthly_amount ? Number(form.monthly_amount) : 0,
        plan_total: form.plan_total ? Number(form.plan_total) : 0,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }

  const iw  = { width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 };
  const fld = { marginBottom: 14 };

  return (
    <Portal>
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={14} style={{ color: 'var(--accent-text)' }} /> Edit Billing Plan
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={16} /></button>
        </div>

        <div style={{ padding: '18px 20px' }}>
          {/* Plan radio row */}
          <div style={fld}>
            <label style={lbl}>Plan</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Free', 'Pro', 'Premium'].map(plan => {
                const active = form.plan_name === plan;
                const colors = {
                  Free:    { bg: active ? '#1A1A2E' : 'var(--bg-input)',    border: active ? '#4B4B8F' : 'var(--border)', text: active ? '#8B8BFF' : 'var(--text-secondary)' },
                  Pro:     { bg: active ? 'var(--accent-light)' : 'var(--bg-input)', border: active ? 'hsla(219,74%,53%,0.5)' : 'var(--border)', text: active ? 'var(--accent-text)' : 'var(--text-secondary)' },
                  Premium: { bg: active ? 'rgba(255,180,0,0.1)' : 'var(--bg-input)', border: active ? 'rgba(255,180,0,0.5)' : 'var(--border)', text: active ? 'var(--yellow-text)' : 'var(--text-secondary)' },
                };
                const c = colors[plan];
                return (
                  <button key={plan} type="button" onClick={() => set('plan_name', plan)}
                    style={{ flex: 1, padding: '11px 8px', borderRadius: 9, border: `2px solid ${c.border}`, background: c.bg, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{plan}</div>
                    {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.text, margin: '4px auto 0' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount + Plan Total + Cycle — only for paid plans */}
          {isPaid && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fld}>
                  <label style={lbl}>Monthly Amount (₹)</label>
                  <input className="input" type="number" style={{ ...iw, fontFamily: 'DM Mono, monospace' }}
                    value={form.monthly_amount} onChange={e => set('monthly_amount', e.target.value)} placeholder="5000" />
                </div>
                <div style={fld}>
                  <label style={lbl}>Plan Total (₹)</label>
                  <input className="input" type="number" style={{ ...iw, fontFamily: 'DM Mono, monospace' }}
                    value={form.plan_total} onChange={e => set('plan_total', e.target.value)} placeholder="15000" />
                </div>
              </div>
              <div style={fld}>
                <label style={lbl}>Billing Cycle</label>
                <div style={{ position: 'relative' }}>
                  <select className="input" style={{ ...iw, appearance: 'none' }} value={form.billing_cycle} onChange={e => set('billing_cycle', e.target.value)}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Yearly</option>
                  </select>
                  <ChevronDown size={11} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </>
          )}

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fld}>
              <label style={lbl}>Start Date</label>
              <input className="input" type="date" style={{ ...iw, fontFamily: 'DM Mono, monospace', colorScheme: 'dark' }}
                value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div style={fld}>
              <label style={lbl}>Plan End Date</label>
              <input className="input" type="date" style={{ ...iw, fontFamily: 'DM Mono, monospace', colorScheme: 'dark' }}
                value={form.plan_end_date} onChange={e => set('plan_end_date', e.target.value)} />
            </div>
          </div>
          <div style={{ ...fld, marginBottom: 0 }}>
            <label style={lbl}>Next Payment Date</label>
            <input className="input" type="date" style={{ ...iw, fontFamily: 'DM Mono, monospace', colorScheme: 'dark' }}
              value={form.next_due_date} onChange={e => set('next_due_date', e.target.value)} />
          </div>

          {error && (
            <div style={{ marginTop: 10, padding: '9px 13px', background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--red-text)', display: 'flex', gap: 7, alignItems: 'center' }}>
              <AlertCircle size={12} /> {error}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ flex: 1, gap: 7 }} onClick={save} disabled={saving}>
            {saving ? <><Loader2 size={12} className="spin" /> Saving…</> : <><Check size={12} /> Save Plan</>}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

function PaymentRow({ payment: p, i, onDeleted }) {
  const [deleting, setDeleting]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    setShowConfirm(false);
    try {
      await api.delete(`/billing/payments/${p.id}`);
      onDeleted?.();
    } catch { /* ignore */ } finally { setDeleting(false); }
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 12, padding: '10px 12px', background: i % 2 === 0 ? 'var(--bg-input)' : 'transparent', borderRadius: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            ₹{Number(p.amount).toLocaleString('en-IN')}
          </div>
          {p.reference_no && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.reference_no}</div>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
          <div>{p.payment_method ? p.payment_method.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'}</div>
          <div style={{ marginTop: 2 }}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
        </div>
        <button onClick={() => setShowConfirm(true)} disabled={deleting}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', opacity: deleting ? 0.5 : 1, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--red-text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          {deleting ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
        </button>
      </div>

      {showConfirm && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: 16 }}>
            <div className="card" style={{ width: '100%', maxWidth: 360, padding: '24px 24px 20px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Trash2 size={18} style={{ color: 'var(--red-text)' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Delete Payment?</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                ₹{Number(p.amount).toLocaleString('en-IN')} on {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} will be permanently removed.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>Cancel</button>
                <button onClick={confirmDelete} style={{ flex: 1, height: 38, background: 'var(--red-text)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

/* ─── Billing Tab ────────────────────────────────────────────────────────── */
function BillingTab({ clientId, billing }) {
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);

  const isFree = !billing?.plan_name || billing.plan_name === 'Free';

  const { data: paymentsData, refetch: refetchPayments } = useQuery({
    queryKey: ['payments', clientId],
    queryFn:  () => api.get(`/billing/${clientId}/payments?limit=20`).then(r => r.data),
    enabled:  !!clientId,
  });
  const payments = paymentsData?.payments ?? [];
  const totalEarned = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  function fmt(v) { return v ? `₹${Number(v).toLocaleString('en-IN')}` : '—'; }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

  // Smart status label + colors based on next_due_date
  function getStatusBadge() {
    if (isFree) return null;
    const due = billing?.next_due_date ? new Date(billing.next_due_date) : null;
    const now  = new Date();
    if (due) {
      const diffDays = Math.round((due - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0)  return { label: 'Overdue',                  color: 'var(--red-text)',    bg: 'var(--red-light)' };
      if (diffDays === 0) return { label: 'Due Today',               color: 'var(--red-text)',    bg: 'var(--red-light)' };
      if (diffDays <= 5)  return { label: `${diffDays} days left`,   color: 'var(--yellow-text)', bg: 'var(--yellow-light)' };
      if (diffDays <= 14) return { label: `Due in ${diffDays} days`, color: 'var(--yellow-text)', bg: 'var(--yellow-light)' };
      return { label: 'Active', color: 'var(--green-text)', bg: 'var(--green-light)' };
    }
    if (billing?.payment_status === 'overdue') return { label: 'Overdue',  color: 'var(--red-text)',    bg: 'var(--red-light)' };
    if (billing?.payment_status === 'paid')    return { label: 'Active',   color: 'var(--green-text)',  bg: 'var(--green-light)' };
    if (billing?.payment_status === 'pending') return { label: 'Pending',  color: 'var(--yellow-text)', bg: 'var(--yellow-light)' };
    return null;
  }

  const statusBadge = getStatusBadge();

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Plan overview card */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: isFree ? 0 : 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Current Plan</div>
              <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 34, color: 'var(--text-primary)', lineHeight: 1 }}>
                {billing?.plan_name || 'Free'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {statusBadge && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.color}33` }}>
                  {statusBadge.label}
                </span>
              )}
              <button className="btn-ghost" onClick={() => setShowEditPlan(true)} style={{ gap: 6, fontSize: 13 }}>
                <Pencil size={12} /> Edit Plan
              </button>
            </div>
          </div>

          {/* Details grid — hidden for Free plan */}
          {!isFree && (() => {
            const MULT    = { monthly: 1, quarterly: 3, annually: 12 };
            const mult    = MULT[billing?.billing_cycle] || 1;
            const autoTotal = (Number(billing?.monthly_amount) || 0) * mult;
            const planTotal = Number(billing?.plan_total) > 0 ? Number(billing.plan_total) : autoTotal;
            const pending   = Math.max(0, planTotal - totalEarned);
            const isPaid    = planTotal > 0 && totalEarned >= planTotal;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Monthly Amount', value: fmt(billing?.monthly_amount), mono: true, accent: true },
                  { label: 'Billing Cycle',  value: billing?.billing_cycle ? billing.billing_cycle.charAt(0).toUpperCase() + billing.billing_cycle.slice(1) : '—' },
                  { label: 'Start Date',     value: fmtDate(billing?.start_date) },
                  { label: 'Plan End Date',  value: fmtDate(billing?.plan_end_date) },
                  { label: 'Next Payment',   value: fmtDate(billing?.next_due_date) },
                ].map(item => (
                  <div key={item.label} style={{ padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontFamily: item.mono ? 'DM Mono, monospace' : 'inherit', fontSize: item.mono ? 20 : 14, fontWeight: 600, color: item.accent ? 'var(--accent-text)' : 'var(--text-primary)' }}>{item.value}</div>
                  </div>
                ))}
                {/* Pending Amount tile — auto-calculated from cycle */}
                <div style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${isPaid ? 'rgba(22,163,74,0.3)' : 'rgba(180,83,9,0.3)'}`, background: isPaid ? 'var(--green-light)' : 'var(--yellow-light)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: isPaid ? 'var(--green-text)' : 'var(--yellow-text)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Pending Amount</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 700, color: isPaid ? 'var(--green-text)' : 'var(--yellow-text)', marginBottom: 6 }}>
                    {isPaid ? '₹0' : `₹${pending.toLocaleString('en-IN')}`}
                  </div>
                  <div style={{ fontSize: 10, color: isPaid ? 'var(--green-text)' : 'var(--yellow-text)', opacity: 0.75, lineHeight: 1.6 }}>
                    <div>Total: ₹{planTotal.toLocaleString('en-IN')}</div>
                    <div>Received: ₹{totalEarned.toLocaleString('en-IN')}</div>
                    {isPaid && <div style={{ fontWeight: 600 }}>Fully Paid ✓</div>}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Total Earnings */}
        {payments.length > 0 && (
          <div className="card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderLeft: '3px solid var(--green-text)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Total Earnings</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 26, fontWeight: 700, color: 'var(--green-text)', lineHeight: 1 }}>
                ₹{totalEarned.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>from</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>{payments.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{payments.length === 1 ? 'payment' : 'payments'}</div>
            </div>
          </div>
        )}

        {/* Record payment — only for paid plans */}
        {!isFree && (
        <div className="card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Record a Payment</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Log a received payment and update the billing status</div>
          </div>
          <button className="btn-primary" onClick={() => setShowPayment(true)} style={{ gap: 7, flexShrink: 0 }}>
            <Plus size={13} /> Record Payment
          </button>
        </div>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="card" style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14 }}>Payment History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {payments.map((p, i) => (
                <PaymentRow key={p.id} payment={p} i={i} onDeleted={refetchPayments} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showEditPlan && (
        <BillingEditModal
          clientId={clientId}
          billing={billing}
          onClose={() => setShowEditPlan(false)}
          onSaved={() => {
            setShowEditPlan(false);
            queryClient.invalidateQueries({ queryKey: ['client', clientId] });
          }}
        />
      )}
      {showPayment && (
        <RecordPaymentModal
          clientId={clientId}
          defaultAmount={billing?.monthly_amount}
          billing={billing}
          totalEarned={totalEarned}
          onClose={() => setShowPayment(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['client', clientId] });
            refetchPayments();
          }}
        />
      )}
    </>
  );
}

/* ─── Notes Tab ──────────────────────────────────────────────────────────── */
const NOTE_TYPE_META = {
  general:  { label: 'General',  bg: 'var(--bg-input)',     color: 'var(--text-muted)'  },
  strategy: { label: 'Strategy', bg: 'var(--accent-light)', color: 'var(--accent-text)' },
  feedback: { label: 'Feedback', bg: 'var(--yellow-light)', color: 'var(--yellow-text)' },
  task:     { label: 'Task',     bg: 'var(--green-light)',  color: 'var(--green-text)'  },
};

function NotesTab({ clientId }) {
  const queryClient = useQueryClient();
  const [text, setText]     = useState('');
  const [type, setType]     = useState('general');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['notes', clientId],
    queryFn:  () => api.get(`/clients/${clientId}/notes`).then(r => r.data),
    enabled:  !!clientId,
    staleTime: 0,
  });
  const notes = data?.notes ?? [];

  async function addNote() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.post(`/clients/${clientId}/notes`, { note_text: text.trim(), note_type: type });
      queryClient.invalidateQueries({ queryKey: ['notes', clientId] });
      setText('');
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function deleteNote(noteId) {
    setDeleting(noteId);
    try {
      await api.delete(`/clients/${clientId}/notes/${noteId}`);
      queryClient.invalidateQueries({ queryKey: ['notes', clientId] });
    } catch { /* ignore */ } finally { setDeleting(null); }
  }

  function fmtDate(str) {
    if (!str) return '';
    const d = new Date(str.replace(' ', 'T') + 'Z');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Add note form */}
      <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Type selector */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {Object.entries(NOTE_TYPE_META).map(([val, m]) => (
            <button
              key={val}
              type="button"
              onClick={() => setType(val)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${type === val ? 'transparent' : 'var(--border)'}`,
                background: type === val ? m.bg : 'transparent',
                color: type === val ? m.color : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >{m.label}</button>
          ))}
        </div>

        <textarea
          className="input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write a note…"
          style={{ height: 90, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={addNote} disabled={saving || !text.trim()} style={{ height: 36, gap: 6, paddingLeft: 20, paddingRight: 20 }}>
            {saving ? <><Loader2 size={13} className="spin" /> Saving…</> : <><Plus size={13} /> Add Note</>}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="card">{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ margin: '12px 20px', height: 60, borderRadius: 8 }} />)}</div>
      ) : notes.length === 0 ? (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <StickyNote size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No notes yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Add your first note above</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {notes.map((n, i) => {
            const m = NOTE_TYPE_META[n.note_type] || NOTE_TYPE_META.general;
            return (
              <div key={n.id} style={{ padding: '14px 18px', borderBottom: i < notes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: m.bg, color: m.color }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(n.created_at)}</span>
                    {n.author_name && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {n.author_name}</span>}
                  </div>
                  <button
                    onClick={() => deleteNote(n.id)}
                    disabled={deleting === n.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red-text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Delete note"
                  >
                    {deleting === n.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{n.note_text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Shared constants ───────────────────────────────────────────────────── */
const INDIAN_STATES_LIST = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];


/* ─── Tag chip input (inline, no external dep) ───────────────────────────── */
function TagInput({ value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  function addTag(raw) {
    const merged = [...new Set([...tags, ...raw.split(',').map(t => t.trim()).filter(Boolean)])];
    onChange(merged.join(', '));
    setInput('');
  }
  function removeTag(i) { onChange(tags.filter((_, idx) => idx !== i).join(', ')); }
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (input.trim()) addTag(input); }
    else if (e.key === 'Backspace' && !input && tags.length) removeTag(tags.length - 1);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'text', minHeight: 40, alignItems: 'center' }}
      onClick={e => e.currentTarget.querySelector('input')?.focus()}>
      {tags.map((tag, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent-light)', border: '1px solid hsla(219,74%,53%,0.25)', color: 'var(--accent-text)', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 500 }}>
          {tag}<X size={9} style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); removeTag(i); }} />
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? placeholder : 'Add more…'}
        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', flex: '1 0 80px', padding: '1px 0' }} />
    </div>
  );
}

/* ─── Delete Confirm Modal ───────────────────────────────────────────────── */
function DeleteConfirmModal({ clientName, onClose, onConfirm, loading }) {
  return (
    <Portal>
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '28px 28px 22px' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Trash2 size={22} style={{ color: 'var(--red-text)' }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Delete Client?</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 24 }}>
          This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{clientName}</strong> and all associated data — posts, keywords, billing, reviews, and notes. This action <strong style={{ color: 'var(--red-text)' }}>cannot be undone</strong>.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, height: 40, border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
              background: 'var(--red-text)', color: '#fff', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s',
            }}
          >
            {loading ? <><Loader2 size={13} className="spin" /> Deleting…</> : <><Trash2 size={13} /> Yes, Delete</>}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ClientOverviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');
  const { isMobile } = useBreakpoint();
  const [inlineEdit,     setInlineEdit]    = useState(null);
  const [showDelete,     setShowDelete]    = useState(false);
  const [deleting,       setDeleting]      = useState(false);
  const [toggling,       setToggling]      = useState(false);
  const [showPublicLink, setShowPublicLink] = useState(false);
  const [publicToken,    setPublicToken]   = useState(null);
  const [genLoading,     setGenLoading]    = useState(false);
  const [linkCopied,     setLinkCopied]    = useState(false);

  const { data: clientData, isLoading, isError, refetch: refetchClient } = useQuery({
    queryKey: ['client', id],
    queryFn:  () => api.get(`/clients/${id}`).then(r => r.data),
    enabled:  !!id,
    staleTime: 30_000,
  });

  const client  = clientData?.client;
  const seo     = clientData?.seo;
  const billing = clientData?.billing;
  const stats   = clientData?.stats;

  const initials = client?.business_name
    ? client.business_name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '..';
  const isActive = client?.status === 'active';

  async function openPublicLink() {
    setShowPublicLink(true);
    if (publicToken) return;
    try {
      const r = await api.get(`/public/token/${id}`);
      setPublicToken(r.data.token || null);
    } catch { setPublicToken(null); }
  }

  async function generatePublicLink() {
    setGenLoading(true);
    try {
      const r = await api.post(`/public/generate/${id}`);
      setPublicToken(r.data.token);
    } finally { setGenLoading(false); }
  }

  function copyPublicLink() {
    if (!publicToken) return;
    const url = `${window.location.origin}/public/${publicToken}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  async function handleToggleStatus() {
    if (!client || toggling) return;
    const newStatus = isActive ? 'inactive' : 'active';
    setToggling(true);
    try {
      await api.put(`/clients/${id}`, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch { /* ignore */ } finally { setToggling(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/clients/${id}`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      navigate('/clients');
    } catch { setDeleting(false); setShowDelete(false); }
  }

  async function handleInlineSave(fieldKey, value, isBilling) {
    if (isBilling) {
      await api.put(`/billing/${id}`, { [fieldKey]: value });
    } else {
      await api.put(`/clients/${id}`, { [fieldKey]: value });
    }
    queryClient.invalidateQueries({ queryKey: ['client', id] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    setInlineEdit(null);
  }

  return (
    <div className="page" style={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* Modals */}
      {showDelete && (
        <DeleteConfirmModal
          clientName={client?.business_name}
          loading={deleting}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      {/* Public Link Modal */}
      {showPublicLink && (
        <Portal>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) setShowPublicLink(false); }}
          >
            <div className="card" style={{ width: '100%', maxWidth: 440, padding: '24px 24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Client Share Link</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Read-only · No login required</div>
                </div>
                <button onClick={() => setShowPublicLink(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={15} /></button>
              </div>

              {publicToken ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Share URL</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all', fontFamily: 'DM Mono, monospace' }}>
                      {`${window.location.origin}/public/${publicToken}`}
                    </div>
                    <button
                      onClick={copyPublicLink}
                      className="btn-primary"
                      style={{ height: 38, paddingLeft: 14, paddingRight: 14, fontSize: 12, gap: 6, flexShrink: 0 }}
                    >
                      {linkCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
                    This link shows posts, selected keywords, plan & next payment date. No edit or approve actions are visible.
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Regenerate to invalidate old link</span>
                    <button onClick={generatePublicLink} className="btn-ghost" disabled={genLoading} style={{ fontSize: 12, height: 32, gap: 6 }}>
                      {genLoading ? <><Loader2 size={12} className="spin" /> Generating…</> : <><RefreshCw size={12} /> Regenerate</>}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <ExternalLink size={32} style={{ color: 'var(--accent-text)', margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No link generated yet</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Generate a shareable link to send to this client.</div>
                  <button onClick={generatePublicLink} className="btn-primary" disabled={genLoading} style={{ gap: 7 }}>
                    {genLoading ? <><Loader2 size={13} className="spin" /> Generating…</> : <><ExternalLink size={13} /> Generate Link</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}

      <button onClick={() => navigate('/clients')} className="btn-ghost" style={{ gap: 6, marginBottom: 20, fontSize: 13, height: 34 }}>
        <ArrowLeft size={14} /> Back to Clients
      </button>

      {/* Error state for client load */}
      {isError && (
        <div className="card error-state">
          <div className="error-state-emoji">⚠️</div>
          <div className="error-state-title">Failed to load client</div>
          <div className="error-state-sub">The client may not exist or there was a connection issue</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn-ghost" onClick={() => navigate('/clients')}>Back to Clients</button>
            <button className="btn-primary" onClick={() => refetchClient()}>Retry</button>
          </div>
        </div>
      )}

      {/* Header card + tabs — hidden when error */}
      {!isError && isLoading ? (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="skeleton" style={{ height: 22, width: '35%', borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 14, width: '55%', borderRadius: 6 }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 20, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 16 }}>
          {/* Left: avatar + info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            <ClientAvatar client={client} size={52} radius={12} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: isMobile ? 18 : 22, color: 'var(--text-primary)' }}>{client?.business_name}</h2>
                {/* Status badge */}
                {client?.status && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: isActive ? 'var(--green-light)' : '#1A1A1A',
                    color: isActive ? 'var(--green-text)' : 'var(--text-muted)',
                    textTransform: 'capitalize',
                  }}>{client.status}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {[{ icon: Building2, text: client?.category }, { icon: MapPin, text: client?.city }].filter(x => x.text).map(({ icon: Icon, text }) => (
                  <span key={text} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Icon size={11} />{text}</span>
                ))}
                {(stats?.avg_rating || stats?.total > 0) && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={11} style={{ color: 'var(--yellow-text)' }} />{stats.avg_rating ?? '—'} ({stats.total ?? 0})
                    {stats?.pending_replies > 0 && <span style={{ marginLeft: 4, fontSize: 10, background: 'var(--red-light)', color: 'var(--red-text)', padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>{stats.pending_replies} pending</span>}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>

            {/* Active / Inactive toggle */}
            <button
              onClick={handleToggleStatus}
              disabled={toggling}
              title={isActive ? 'Click to set Inactive' : 'Click to set Active'}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, height: 36,
                padding: '0 14px', borderRadius: 8, cursor: toggling ? 'not-allowed' : 'pointer',
                border: `1px solid ${isActive ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                background: isActive ? 'var(--green-light)' : 'var(--bg-input)',
                color: isActive ? 'var(--green-text)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                opacity: toggling ? 0.6 : 1,
              }}
            >
              {toggling
                ? <Loader2 size={14} className="spin" />
                : isActive
                  ? <ToggleRight size={16} />
                  : <ToggleLeft size={16} />
              }
              {isActive ? 'Active' : 'Inactive'}
            </button>

            {/* Public share link */}
            <button
              onClick={openPublicLink}
              className="btn-ghost"
              style={{ height: 36, fontSize: 13, gap: 7, display: 'flex', alignItems: 'center' }}
              title="Share client report"
            >
              <ExternalLink size={13} />
              <span>Public Link</span>
              {publicToken && (
                <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--green-light)', color: 'var(--green-text)', borderRadius: 10, padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active
                </span>
              )}
            </button>

            {/* Google link */}
            {client?.gbp_link && (
              <a href={client.gbp_link} target="_blank" rel="noopener noreferrer"
                className="btn-ghost"
                style={{ height: 36, fontSize: 13, textDecoration: 'none', textAlign: 'center', gap: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ExternalLink size={13} /> Google
              </a>
            )}

            {/* Delete */}
            <button
              onClick={() => setShowDelete(true)}
              title="Delete client permanently"
              style={{
                width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)',
                background: 'var(--red-light)', color: 'var(--red-text)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-light)'; }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Tabs — only shown when client loaded */}
      {!isError && !isLoading && <>
        <div className="tab-bar-scroll" style={{ marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`tab ${tab === t.id ? 'tab-active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>

        {tab === 'overview'  && <OverviewTab client={client} billing={billing} onFieldEdit={setInlineEdit} />}
        {inlineEdit && <InlineEditPopup config={inlineEdit} onSave={handleInlineSave} onClose={() => setInlineEdit(null)} />}
        {tab === 'ai'        && <AIProfileTab clientId={id} client={client} onGoToKeywords={() => setTab('keywords')} />}
        {tab === 'posts'     && <PostsTab clientId={id} />}
        {tab === 'keywords'  && <KeywordsTab clientId={id} />}
        {tab === 'billing'   && <BillingTab clientId={id} billing={billing} />}
        {tab === 'reviews'   && <ReviewsTab clientId={id} />}
        {tab === 'notes'     && <NotesTab clientId={id} />}
      </>}
    </div>
  );
}
