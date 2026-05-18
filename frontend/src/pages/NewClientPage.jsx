import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, MapPin, Globe, Sparkles, Wand2,
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle,
  CheckCircle2, ChevronDown, X,
} from 'lucide-react';
import api from '../services/api';
import { useBreakpoint } from '../hooks/useBreakpoint';

/* ── Step metadata ──────────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, title: 'Business',   desc: 'Identity & category',    Icon: Building2 },
  { id: 2, title: 'Contact',    desc: 'Phone, city & website',   Icon: MapPin    },
  { id: 3, title: 'GBP',        desc: 'Google listing & billing', Icon: Globe    },
  { id: 4, title: 'Strategy',   desc: 'SEO & content goals',     Icon: Sparkles  },
  { id: 5, title: 'AI Profile', desc: 'Generate & save client',  Icon: Wand2     },
];

const BRAND_TONES  = ['professional', 'friendly', 'luxury', 'budget-friendly', 'medical', 'traditional', 'modern'];
const LANG_OPTIONS = ['English', 'Hindi', 'English + Hindi', 'Hinglish', 'Regional'];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
  '— Union Territories —',
  'Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi',
  'Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const INITIAL = {
  business_name: '', client_name: '', owner_name: '', category: '', industry: '',
  phone: '', whatsapp: '', email: '', website: '',
  address: '', city: '', state: '', pincode: '',
  gbp_link: '', localo_link: '', about_business: '',
  plan_name: '', monthly_amount: '', billing_cycle: 'monthly',
  start_date: '', next_payment_date: '', notes: '',
  business_type: '', services: '', products: '', usp: '',
  target_person_type: '', target_age_group: '', target_behavior: '', target_interest: '',
  target_areas: '', brand_tone: 'professional',
  language_preference: 'English', seo_goal: '',
};

/* ── Validation ─────────────────────────────────────────────────────────────── */
function validate(step, data) {
  const e = {};
  if (step === 1) {
    if (!data.business_name?.trim()) e.business_name = 'Business name is required';
    if (!data.client_name?.trim())   e.client_name   = 'Contact person name is required';
    if (!data.category?.trim())      e.category      = 'Category is required';
  }
  if (step === 2) {
    if (!data.phone?.trim()) e.phone = 'Phone number is required';
    if (data.phone && !/^\d{10}$/.test(data.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid 10-digit number';
    if (!data.city?.trim())  e.city  = 'City is required';
  }
  return e;
}

/* ── Small UI helpers ───────────────────────────────────────────────────────── */
function Err({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ fontSize: 11, color: 'var(--red-text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
      <AlertCircle size={11} />{msg}
    </div>
  );
}

function F({ label, hint, required, children }) {
  return (
    <div className="field">
      <label className="label">
        {label}{required && <span style={{ color: 'var(--red-text)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

/* ── Tag chip input ─────────────────────────────────────────────────────────── */
function TagInput({ value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  function addTag(raw) {
    const newTags = raw.split(',').map(t => t.trim()).filter(Boolean);
    const merged = [...new Set([...tags, ...newTags])];
    onChange(merged.join(', '));
    setInput('');
  }

  function removeTag(i) {
    onChange(tags.filter((_, idx) => idx !== i).join(', '));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags.length - 1);
    }
  }

  function handleBlur() {
    if (input.trim()) addTag(input);
  }

  return (
    <div
      style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px',
        background: 'var(--bg-input)', border: '1px solid var(--border)',
        borderRadius: 8, cursor: 'text', minHeight: 44, alignItems: 'center',
      }}
      onClick={e => e.currentTarget.querySelector('input')?.focus()}
    >
      {tags.map((tag, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'var(--accent-light)', border: '1px solid hsla(219,74%,53%,0.25)',
          color: 'var(--accent-text)', borderRadius: 20,
          padding: '3px 10px', fontSize: 12, fontWeight: 500, lineHeight: 1,
        }}>
          {tag}
          <X size={10} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); removeTag(i); }} />
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : 'Add more…'}
        style={{
          border: 'none', background: 'transparent', outline: 'none',
          fontSize: 13, color: 'var(--text-primary)', flex: '1 0 100px',
          minWidth: 80, padding: '2px 0',
        }}
      />
    </div>
  );
}

/* ── Step indicator ─────────────────────────────────────────────────────────── */
function StepBar({ current }) {
  const { isMobile } = useBreakpoint();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((s, i) => {
        const done    = current > s.id;
        const active  = current === s.id;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : '0 0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: done ? 'var(--green-text)' : active ? 'var(--accent)' : 'var(--bg-input)',
                border: `2px solid ${done ? 'var(--green-text)' : active ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
                color: done || active ? '#fff' : 'var(--text-muted)',
              }}>
                {done ? <Check size={16} /> : <s.Icon size={15} />}
              </div>
              {!isMobile && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: active ? 'var(--accent-text)' : done ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {s.title}
                  </div>
                </div>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: isMobile ? '0 4px' : '0 8px',
                marginBottom: isMobile ? 0 : 22,
                background: done ? 'var(--green-text)' : 'var(--border)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Score ring ─────────────────────────────────────────────────────────────── */
function ScoreRing({ score }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - score / 100);
  const color = score >= 80 ? 'var(--green-text)' : score >= 60 ? 'var(--yellow-text)' : 'var(--red-text)';
  return (
    <div style={{ position: 'relative', width: 108, height: 108, flexShrink: 0 }}>
      <svg width="108" height="108" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="54" cy="54" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="54" cy="54" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={fill}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</span>
      </div>
    </div>
  );
}

/* ── AI Result card ─────────────────────────────────────────────────────────── */
function AIResultCard({ result }) {
  const score   = result.optimization_score ?? 0;
  const actions = Array.isArray(result.action_plan) ? result.action_plan.slice(0, 5) : [];
  const services = Array.isArray(result.suggested_services) ? result.suggested_services.slice(0, 3) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <ScoreRing score={score} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>
            Suggested Business Name
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            {result.suggested_business_name || '—'}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>
            Primary GBP Category
          </div>
          <div style={{ fontSize: 13, color: 'var(--accent-text)', background: 'var(--accent-light)', padding: '3px 10px', borderRadius: 6, display: 'inline-block', fontWeight: 600 }}>
            {result.suggested_category_primary || '—'}
          </div>
        </div>
      </div>

      {result.suggested_short_description && (
        <div className="card" style={{ padding: '14px 18px', border: '1px solid hsla(219,74%,53%,0.25)', background: 'var(--accent-light)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-text)', marginBottom: 6 }}>Tagline</div>
          <div style={{ fontSize: 13, color: 'var(--accent-text)', fontStyle: 'italic', lineHeight: 1.6 }}>
            "{result.suggested_short_description}"
          </div>
        </div>
      )}

      {result.suggested_description && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            GBP Description ({result.suggested_description.length} chars)
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
            {result.suggested_description}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: services.length ? '1fr 1fr' : '1fr', gap: 16 }}>
        {services.length > 0 && (
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Suggested Services
            </div>
            {services.map((s, i) => (
              <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < services.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.description}</div>
              </div>
            ))}
          </div>
        )}
        {actions.length > 0 && (
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Action Plan
            </div>
            {actions.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--accent-text)', background: 'var(--accent-light)', borderRadius: 4, padding: '2px 6px', flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Section divider helper ─────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
      color: 'var(--text-muted)', marginBottom: 12, marginTop: 4,
      paddingBottom: 8, borderBottom: '1px solid var(--border)',
    }}>
      {children}
    </div>
  );
}

/* ── Step 1: Business identity ──────────────────────────────────────────────── */
function Step1({ data, update, errors }) {
  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.get('/categories').then(r => r.data),
    staleTime: 5 * 60_000,
  });
  const categories = catsData?.categories ?? [];

  function handleCategory(val) {
    const cat = categories.find(c => c.name === val);
    update({ category: val, industry: cat?.industry || data.industry });
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <F label="Business Name" required>
          <input className="input" value={data.business_name} onChange={e => update({ business_name: e.target.value })}
            placeholder="e.g. Sharma Dental Clinic" style={{ borderColor: errors.business_name ? 'var(--red-text)' : undefined }} />
          <Err msg={errors.business_name} />
        </F>
      </div>
      <F label="Contact Person Name" required hint="The primary contact at this client's business">
        <input className="input" value={data.client_name} onChange={e => update({ client_name: e.target.value })}
          placeholder="e.g. Dr. Rajesh Sharma" style={{ borderColor: errors.client_name ? 'var(--red-text)' : undefined }} />
        <Err msg={errors.client_name} />
      </F>
      <F label="Owner / Director Name">
        <input className="input" value={data.owner_name} onChange={e => update({ owner_name: e.target.value })}
          placeholder="e.g. Priya Sharma" />
      </F>
      <F label="Business Category" required>
        <div style={{ position: 'relative' }}>
          <select
            className="input"
            value={data.category}
            onChange={e => handleCategory(e.target.value)}
            style={{ appearance: 'none', borderColor: errors.category ? 'var(--red-text)' : undefined }}
          >
            <option value="">Select category…</option>
            {categories.length > 0
              ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
              : ['Dental Clinic','Medical Clinic','Restaurant','Cafe','Hotel','Gym','Retail Store',
                  'Law Firm','Chartered Accountant','Real Estate Agency','IT Services','Beauty Salon',
                  'Coaching Centre','Photography Studio','Event Management',
                ].map(c => <option key={c} value={c}>{c}</option>)
            }
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
        </div>
        <Err msg={errors.category} />
      </F>
      <F label="Industry" hint="Auto-filled from category — edit if needed">
        <input className="input" value={data.industry} onChange={e => update({ industry: e.target.value })}
          placeholder="e.g. Dental" />
      </F>
    </div>
  );
}

/* ── Step 2: Contact & address ──────────────────────────────────────────────── */
function Step2({ data, update, errors }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {/* Phone with +91 prefix */}
      <F label="Business Phone" required>
        <div style={{ display: 'flex' }}>
          <span style={{
            padding: '0 12px', background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRight: 'none', borderRadius: '8px 0 0 8px',
            display: 'flex', alignItems: 'center', fontSize: 13,
            color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace',
            flexShrink: 0, userSelect: 'none',
          }}>
            +91
          </span>
          <input
            className="input"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={data.phone}
            onChange={e => update({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="98765 43210"
            style={{
              borderRadius: '0 8px 8px 0',
              borderColor: errors.phone ? 'var(--red-text)' : undefined,
              fontFamily: 'DM Mono, monospace',
            }}
          />
        </div>
        <Err msg={errors.phone} />
      </F>

      {/* WhatsApp with +91 prefix */}
      <F label="WhatsApp Number" hint="Leave blank if same as phone">
        <div style={{ display: 'flex' }}>
          <span style={{
            padding: '0 12px', background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRight: 'none', borderRadius: '8px 0 0 8px',
            display: 'flex', alignItems: 'center', fontSize: 13,
            color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace',
            flexShrink: 0, userSelect: 'none',
          }}>
            +91
          </span>
          <input
            className="input"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={data.whatsapp}
            onChange={e => update({ whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="98765 43210"
            style={{ borderRadius: '0 8px 8px 0', fontFamily: 'DM Mono, monospace' }}
          />
        </div>
      </F>

      <F label="Email Address">
        <input className="input" type="email" value={data.email} onChange={e => update({ email: e.target.value })}
          placeholder="clinic@example.com" />
      </F>
      <F label="Website URL">
        <input className="input" type="url" value={data.website} onChange={e => update({ website: e.target.value })}
          placeholder="https://www.example.com" />
      </F>
      <div style={{ gridColumn: '1 / -1' }}>
        <F label="Full Address">
          <input className="input" value={data.address} onChange={e => update({ address: e.target.value })}
            placeholder="Shop No. 12, Main Market, Sector 21…" />
        </F>
      </div>
      <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <F label="City" required>
          <input className="input" value={data.city} onChange={e => update({ city: e.target.value })}
            placeholder="New Delhi" style={{ borderColor: errors.city ? 'var(--red-text)' : undefined }} />
          <Err msg={errors.city} />
        </F>
        <F label="State">
          <div style={{ position: 'relative' }}>
            <select
              className="input"
              value={data.state}
              onChange={e => update({ state: e.target.value })}
              style={{ appearance: 'none' }}
            >
              <option value="">Select state…</option>
              {INDIAN_STATES.map(s =>
                s.startsWith('—')
                  ? <option key={s} disabled style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{s}</option>
                  : <option key={s} value={s}>{s}</option>
              )}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>
        </F>
        <F label="Pincode">
          <input className="input" value={data.pincode} onChange={e => update({ pincode: e.target.value })}
            placeholder="110001" />
        </F>
      </div>
    </div>
  );
}

/* ── Step 3: GBP + billing ──────────────────────────────────────────────────── */
function Step3({ data, update }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* GBP Links */}
      <div>
        <SectionLabel>Google Business Profile</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <F label="Google Business Profile Link" hint="The full Maps listing URL">
            <input className="input" type="url" value={data.gbp_link} onChange={e => update({ gbp_link: e.target.value })}
              placeholder="https://maps.app.goo.gl/…" />
          </F>
          <F label="Localo / Whitespark Link" hint="Optional tracking tool URL">
            <input className="input" type="url" value={data.localo_link} onChange={e => update({ localo_link: e.target.value })}
              placeholder="https://localo.com/…" />
          </F>
        </div>
      </div>

      {/* About the Business */}
      <F label="About the Business" hint="What is currently showing on their Google listing? AI will use this as reference.">
        <textarea
          className="input" rows={4} value={data.about_business}
          onChange={e => update({ about_business: e.target.value })}
          placeholder="Describe the business — what they do, their history, what makes them unique. This becomes the GBP 'About' section…"
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
      </F>

      {/* Billing */}
      <div>
        <SectionLabel>Billing & Plan</SectionLabel>

        {/* Plan radio buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {['Free', 'Pro', 'Premium'].map(plan => {
            const active = data.plan_name === plan;
            const colors = {
              Free:    { bg: active ? '#1A1A2E' : 'var(--bg-input)',    border: active ? '#4B4B8F' : 'var(--border)', text: active ? '#8B8BFF' : 'var(--text-secondary)' },
              Pro:     { bg: active ? 'var(--accent-light)' : 'var(--bg-input)', border: active ? 'hsla(219,74%,53%,0.5)' : 'var(--border)', text: active ? 'var(--accent-text)' : 'var(--text-secondary)' },
              Premium: { bg: active ? 'rgba(255,180,0,0.1)' : 'var(--bg-input)', border: active ? 'rgba(255,180,0,0.5)' : 'var(--border)', text: active ? 'var(--yellow-text)' : 'var(--text-secondary)' },
            };
            const c = colors[plan];
            return (
              <button
                key={plan}
                type="button"
                onClick={() => update({ plan_name: plan })}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 10,
                  border: `2px solid ${c.border}`, background: c.bg,
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text, letterSpacing: '0.03em' }}>{plan}</div>
                {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.text, margin: '5px auto 0' }} />}
              </button>
            );
          })}
        </div>

        {(data.plan_name === 'Pro' || data.plan_name === 'Premium') && (
          <div className="rg-4">
            <F label="Monthly Amount (₹)">
              <input className="input" type="number" value={data.monthly_amount}
                onChange={e => update({ monthly_amount: e.target.value })}
                placeholder="12000" />
            </F>
            <F label="Billing Cycle">
              <div style={{ position: 'relative' }}>
                <select className="input" value={data.billing_cycle} onChange={e => update({ billing_cycle: e.target.value })} style={{ appearance: 'none' }}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
            </F>
            <F label="Start Date">
              <input
                className="input" type="date" value={data.start_date}
                onChange={e => update({ start_date: e.target.value })}
                style={{ colorScheme: 'light' }}
              />
            </F>
            <F label="Next Payment Date">
              <input
                className="input" type="date" value={data.next_payment_date}
                onChange={e => update({ next_payment_date: e.target.value })}
                style={{ colorScheme: 'light' }}
              />
            </F>
          </div>
        )}
      </div>

      <F label="Internal Notes">
        <textarea className="input" rows={3} value={data.notes}
          onChange={e => update({ notes: e.target.value })}
          placeholder="Any notes for the team about this client…"
          style={{ resize: 'vertical', fontFamily: 'inherit' }} />
      </F>
    </div>
  );
}

/* ── Step 4: Strategy ───────────────────────────────────────────────────────── */
function Step4({ data, update }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        padding: '12px 16px', borderRadius: 10,
        background: 'var(--accent-light)', border: '1px solid hsla(219,74%,53%,0.2)',
        fontSize: 13, color: 'var(--accent-text)', lineHeight: 1.6,
      }}>
        <Sparkles size={13} style={{ display: 'inline', marginRight: 6 }} />
        The more detail you provide here, the better the AI profile will be. All fields are optional but recommended.
      </div>

      {/* Business Type */}
      <F label="Business Type" hint="e.g. Clinic, Restaurant, Retail, Service-based">
        <input className="input" value={data.business_type} onChange={e => update({ business_type: e.target.value })}
          placeholder="e.g. Multi-speciality dental clinic" />
      </F>

      {/* Target Audience — structured */}
      <div>
        <SectionLabel>Target Audience</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          <F label="Person Type" hint="Who are your ideal customers?">
            <input className="input" value={data.target_person_type}
              onChange={e => update({ target_person_type: e.target.value })}
              placeholder="e.g. Business Owners, Families, Students" />
          </F>
          <F label="Age Group" hint="Comma-separated or range">
            <input className="input" value={data.target_age_group}
              onChange={e => update({ target_age_group: e.target.value })}
              placeholder="e.g. 25–45, Seniors, Young adults" />
          </F>
          <F label="Behavior" hint="Online habits, buying triggers">
            <input className="input" value={data.target_behavior}
              onChange={e => update({ target_behavior: e.target.value })}
              placeholder="e.g. Searches online before booking" />
          </F>
          <F label="Interests" hint="Relevant interests & lifestyle">
            <input className="input" value={data.target_interest}
              onChange={e => update({ target_interest: e.target.value })}
              placeholder="e.g. Health, Wellness, Technology" />
          </F>
        </div>
      </div>

      {/* Target Areas — chip input */}
      <F label="Target Areas / Localities" hint="Press Enter or comma to add each area">
        <TagInput
          value={data.target_areas}
          onChange={val => update({ target_areas: val })}
          placeholder="e.g. South Delhi, Saket, Hauz Khas…"
        />
      </F>

      {/* Brand tone & language */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        <F label="Brand Tone">
          <div style={{ position: 'relative' }}>
            <select className="input" value={data.brand_tone} onChange={e => update({ brand_tone: e.target.value })} style={{ appearance: 'none' }}>
              {BRAND_TONES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>
        </F>
        <F label="Content Language">
          <div style={{ position: 'relative' }}>
            <select className="input" value={data.language_preference} onChange={e => update({ language_preference: e.target.value })} style={{ appearance: 'none' }}>
              {LANG_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>
        </F>
      </div>

      {/* SEO Goal */}
      <div>
        <SectionLabel>SEO Goal for Optimization</SectionLabel>
        <F label="SEO Goal" hint="What ranking or visibility goal should we optimize for?">
          <input className="input" value={data.seo_goal} onChange={e => update({ seo_goal: e.target.value })}
            placeholder="e.g. Rank #1 for 'dentist in South Delhi', appear in local 3-pack…" />
        </F>
      </div>

      {/* Services — chip input */}
      <F label="Services Offered" hint="Press Enter or comma after each service — click × to remove">
        <TagInput
          value={data.services}
          onChange={val => update({ services: val })}
          placeholder="e.g. Teeth cleaning, Braces, Root canal…"
        />
      </F>

      {/* USP — chip input */}
      <F label="Unique Selling Proposition (USP)" hint="Each USP as a separate chip">
        <TagInput
          value={data.usp}
          onChange={val => update({ usp: val })}
          placeholder="e.g. 15 years experience, Same-day appointments…"
        />
      </F>

      {/* Products — chip input */}
      <F label="Products (if any)" hint="Press Enter or comma after each product">
        <TagInput
          value={data.products}
          onChange={val => update({ products: val })}
          placeholder="e.g. Dental kits, Whitening strips…"
        />
      </F>
    </div>
  );
}

/* ── Stage card wrapper ─────────────────────────────────────────────────────── */
function StageCard({ num, title, done, locked, children }) {
  return (
    <div className="card" style={{
      padding: '20px 24px',
      opacity: locked ? 0.45 : 1,
      pointerEvents: locked ? 'none' : undefined,
      borderColor: done ? 'rgba(22,163,74,0.35)' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: done ? 'var(--green-light)' : locked ? 'var(--bg-input)' : 'var(--accent-light)',
          border: `2px solid ${done ? 'var(--green-text)' : locked ? 'var(--border)' : 'hsla(219,74%,53%,0.4)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
          color: done ? 'var(--green-text)' : locked ? 'var(--text-muted)' : 'var(--accent-text)',
        }}>
          {done ? <Check size={12} /> : num}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: locked ? 'var(--text-muted)' : 'var(--text-primary)' }}>
          {title}
        </span>
        {locked && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 20, padding: '1px 8px' }}>Complete step {num - 1} first</span>}
      </div>
      {children}
    </div>
  );
}

/* ── Step 5: Save → Keywords → AI Profile ────────────────────────────────── */
function Step5({ data, onSave, saveLoading, saveError }) {
  const navigate = useNavigate();
  const [savedClientId, setSavedClientId] = useState(null);
  const [keywords,  setKeywords]  = useState([]);
  const [kwLoading, setKwLoading] = useState(false);
  const [kwError,   setKwError]   = useState(null);
  const [aiResult,  setAiResult]  = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState(null);

  async function handleSave() {
    const id = await onSave();
    if (id) setSavedClientId(id);
  }

  async function handleGenerateKeywords() {
    setKwLoading(true);
    setKwError(null);
    try {
      const res = await api.post(`/keywords/${savedClientId}/generate`);
      const kws = res.data.keywords ?? [];
      setKeywords(kws);
      if (kws.length > 0) {
        await api.post(`/keywords/${savedClientId}/select`, { ids: kws.map(k => k.id) });
      }
    } catch (err) {
      setKwError(err.response?.data?.error || 'Failed to generate keywords. Try again.');
    } finally {
      setKwLoading(false);
    }
  }

  async function handleGenerateProfile() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await api.post(`/ai/generate-profile/${savedClientId}`);
      setAiResult(res.data.result);
    } catch (err) {
      setAiError(err.response?.data?.error || 'AI generation failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Stage 1 — Save Client */}
      <StageCard num={1} title="Save Client" done={!!savedClientId} locked={false}>
        {savedClientId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green-text)' }}>
            <CheckCircle2 size={15} /> Client saved — ready to generate keywords
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Save the client record first. Keywords and the AI profile will be generated after.
            </div>
            {saveError && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--red-text)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertCircle size={14} /> {saveError}
              </div>
            )}
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saveLoading}
              style={{ height: 40, paddingLeft: 24, paddingRight: 24, gap: 8 }}
            >
              {saveLoading
                ? <><Loader2 size={14} className="spin" /> Saving client…</>
                : <><Check size={14} /> Save Client</>
              }
            </button>
          </>
        )}
      </StageCard>

      {/* Stage 2 — Generate Keywords */}
      <StageCard num={2} title="Generate Keywords" done={keywords.length > 0} locked={!savedClientId}>
        {keywords.length > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green-text)', marginBottom: 12 }}>
              <CheckCircle2 size={15} /> {keywords.length} keywords generated &amp; selected
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {keywords.map(kw => (
                <span key={kw.id} style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 20,
                  background: 'var(--accent-light)', color: 'var(--accent-text)',
                  border: '1px solid hsla(219,74%,53%,0.2)',
                }}>
                  {kw.keyword}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              AI will analyze your business details and generate the best local SEO keywords for Google Business Profile.
            </div>
            {kwError && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--red-text)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertCircle size={14} /> {kwError}
              </div>
            )}
            {kwLoading && (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 8 }}>
                <Loader2 size={14} className="spin" style={{ color: 'var(--accent-text)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Generating keywords with AI…</span>
              </div>
            )}
            <button
              className="btn-primary"
              onClick={handleGenerateKeywords}
              disabled={kwLoading}
              style={{ height: 40, paddingLeft: 24, paddingRight: 24, gap: 8 }}
            >
              {kwLoading
                ? <><Loader2 size={14} className="spin" /> Generating…</>
                : <><Sparkles size={14} /> Generate Keywords</>
              }
            </button>
          </>
        )}
      </StageCard>

      {/* Stage 3 — Generate AI Profile */}
      <StageCard num={3} title="Generate AI GBP Profile" done={!!aiResult} locked={keywords.length === 0}>
        {aiResult ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green-text)', marginBottom: 14 }}>
              <CheckCircle2 size={15} /> AI profile generated successfully
            </div>
            <AIResultCard result={aiResult} />
            <button
              className="btn-primary"
              onClick={() => navigate(`/clients/${savedClientId}`)}
              style={{ marginTop: 16, height: 42, paddingLeft: 24, paddingRight: 24, gap: 8 }}
            >
              Go to Client <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              AI will create an optimized GBP description, categories, and services based on the generated keywords.
            </div>
            {aiError && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--red-text)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertCircle size={14} /> {aiError}
              </div>
            )}
            {aiLoading && (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 8 }}>
                <Loader2 size={14} className="spin" style={{ color: 'var(--accent-text)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Analyzing with Claude AI — 15–30 seconds…</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={handleGenerateProfile}
                disabled={aiLoading}
                style={{ height: 40, paddingLeft: 24, paddingRight: 24, gap: 8 }}
              >
                {aiLoading
                  ? <><Loader2 size={14} className="spin" /> Generating…</>
                  : <><Wand2 size={14} /> Generate AI Profile</>
                }
              </button>
              <button
                className="btn-ghost"
                onClick={() => navigate(`/clients/${savedClientId}`)}
                style={{ height: 40, paddingLeft: 20, paddingRight: 20 }}
              >
                Skip — go to client
              </button>
            </div>
          </>
        )}
      </StageCard>

    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function NewClientPage() {
  const navigate      = useNavigate();
  const { isMobile }  = useBreakpoint();
  const [step,        setStep]       = useState(1);
  const [formData,    setFormData]   = useState(INITIAL);
  const [errors,      setErrors]     = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError,   setSaveError]  = useState(null);

  function update(fields) {
    setFormData(prev => ({ ...prev, ...fields }));
    const clearedErrs = { ...errors };
    Object.keys(fields).forEach(k => delete clearedErrs[k]);
    setErrors(clearedErrs);
  }

  function handleNext() {
    const errs = validate(step, formData);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSave() {
    setSaveLoading(true);
    setSaveError(null);
    try {
      const phone = formData.phone ? `+91${formData.phone.replace(/\s/g, '')}` : '';
      const whatsapp = formData.whatsapp ? `+91${formData.whatsapp.replace(/\s/g, '')}` : '';
      const target_audience = [
        formData.target_person_type,
        formData.target_age_group && `Age: ${formData.target_age_group}`,
        formData.target_behavior,
        formData.target_interest && `Interests: ${formData.target_interest}`,
      ].filter(Boolean).join('; ');

      const payload = {
        ...formData,
        phone,
        whatsapp,
        target_audience,
        monthly_objective: formData.seo_goal,
        gbp_description_current: formData.about_business,
        monthly_amount: formData.monthly_amount ? Number(formData.monthly_amount) : undefined,
        status: 'active',
      };
      const res = await api.post('/clients', payload);
      setSaveLoading(false);
      return res.data.client.id;
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to create client. Please try again.');
      setSaveLoading(false);
      return null;
    }
  }

  const stepContent = {
    1: <Step1 data={formData} update={update} errors={errors} />,
    2: <Step2 data={formData} update={update} errors={errors} />,
    3: <Step3 data={formData} update={update} />,
    4: <Step4 data={formData} update={update} />,
    5: <Step5 data={formData} onSave={handleSave} saveLoading={saveLoading} saveError={saveError} />,
  };

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 60, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => navigate('/clients')}
          style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: isMobile ? 20 : 26, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Add New Client
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Step {step} of {STEPS.length} — {STEPS[step - 1].desc}
          </div>
        </div>
      </div>

      <StepBar current={step} />

      <div className="card" style={{ padding: isMobile ? '20px 16px' : '28px 32px', marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          {(() => { const s = STEPS[step - 1]; return <s.Icon size={16} style={{ color: 'var(--accent-text)' }} />; })()}
          {STEPS[step - 1].title}
        </div>
        {stepContent[step]}
      </div>

      {step < 5 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn-ghost"
            onClick={step === 1 ? () => navigate('/clients') : handleBack}
            style={{ gap: 6, height: 42 }}
          >
            <ArrowLeft size={14} /> {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            className="btn-primary"
            onClick={handleNext}
            style={{ gap: 6, height: 42, paddingLeft: 24, paddingRight: 24 }}
          >
            {step === 4 ? 'Go to AI Profile' : 'Next'} <ArrowRight size={14} />
          </button>
        </div>
      )}
      {step === 5 && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button className="btn-ghost" onClick={handleBack} style={{ gap: 6, height: 42 }}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      )}
    </div>
  );
}
