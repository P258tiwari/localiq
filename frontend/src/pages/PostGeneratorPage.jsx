import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles, Copy, Check, Image, CalendarDays, Tag,
  ChevronDown, Loader2, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CTA_LABELS = {
  LEARN_MORE:       'Learn More',
  BOOK:             'Book Appointment',
  BOOK_APPOINTMENT: 'Book Appointment',
  ORDER:            'Order Online',
  CALL:             'Call Now',
  CALL_NOW:         'Call Now',
  SIGN_UP:          'Sign Up',
  BUY:              'Buy Now',
  GET_OFFER:        'Get Offer',
};

const POST_TYPE_COLOR = {
  offer:   { bg: 'var(--yellow-light)', color: 'var(--yellow-text)' },
  update:  { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
  event:   { bg: 'var(--green-light)',  color: 'var(--green-text)'  },
};

const LS_CLIENT = 'postgen_client_id';
const LS_MONTH  = 'postgen_month';
const LS_YEAR   = 'postgen_year';

function CopyBtn({ text, small }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      style={{
        background: copied ? 'var(--green-light)' : 'var(--bg-input)',
        border: `1px solid ${copied ? 'var(--green-text)' : 'var(--border)'}`,
        color: copied ? 'var(--green-text)' : 'var(--text-secondary)',
        borderRadius: 6, padding: small ? '3px 6px' : '5px 10px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 12, transition: 'all 0.15s',
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function PostCard({ post, index }) {
  const typeStyle = POST_TYPE_COLOR[post.post_type] || POST_TYPE_COLOR.update;
  const [showPrompt, setShowPrompt] = useState(false);

  const dateStr = post.suggested_date
    ? new Date(post.suggested_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: typeStyle.bg, color: typeStyle.color,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {post.post_type || 'update'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={10} />
              {dateStr} · {post.suggested_time || '—'}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {post.post_heading || post.post_title}
          </div>
          {post.why_post && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic', lineHeight: 1.4 }}>
              {post.why_post}
            </div>
          )}
        </div>
        <span style={{
          fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '2px 8px', flexShrink: 0,
        }}>
          #{index + 1}
        </span>
      </div>

      <div style={{ padding: '14px 18px', flex: 1 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12, whiteSpace: 'pre-line' }}>
          {post.post_description}
        </p>

        {post.keywords_used?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {post.keywords_used.map(kw => (
              <span key={kw} style={{ fontSize: 11, color: 'var(--accent-text)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tag size={9} /> {kw}
              </span>
            ))}
          </div>
        )}

        {post.image_prompt && (
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setShowPrompt(v => !v)}
              style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Image size={12} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, textAlign: 'left' }}>Image prompt</span>
              <ChevronDown size={12} style={{ color: 'var(--text-muted)', transform: showPrompt ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showPrompt && (
              <div style={{ padding: '0 12px 10px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', lineHeight: 1.6, flex: 1, margin: 0 }}>
                  {post.image_prompt}
                </p>
                <CopyBtn text={post.image_prompt} small />
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          CTA: <span style={{ color: 'var(--accent-text)', fontWeight: 500 }}>{CTA_LABELS[post.cta_text] || post.cta_text || 'Learn More'}</span>
        </div>
        <CopyBtn text={`${post.post_heading || post.post_title || ''}\n\n${post.post_description || ''}`} small />
      </div>
    </div>
  );
}

function PlaceholderCard({ number }) {
  return (
    <div style={{
      border: '1.5px dashed var(--border)', borderRadius: 12,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, gap: 8, minHeight: 200,
    }}>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>#{number}</span>
      <div style={{ width: 32, height: 32, borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={14} style={{ color: 'var(--text-muted)' }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Post slot</span>
    </div>
  );
}

export default function PostGeneratorPage() {
  const now = new Date();

  const [clientId, setClientId] = useState(() => localStorage.getItem(LS_CLIENT) || '');
  const [month,    setMonth]    = useState(() => {
    const v = localStorage.getItem(LS_MONTH);
    return v !== null ? parseInt(v) : now.getMonth();
  });
  const [year, setYear] = useState(() => {
    const v = localStorage.getItem(LS_YEAR);
    return v !== null ? parseInt(v) : now.getFullYear();
  });

  const [posts,     setPosts]     = useState([]);
  const [generated, setGenerated] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => { if (clientId) localStorage.setItem(LS_CLIENT, clientId); }, [clientId]);
  useEffect(() => { localStorage.setItem(LS_MONTH, String(month)); }, [month]);
  useEffect(() => { localStorage.setItem(LS_YEAR,  String(year));  }, [year]);

  const { data: clientsData, isLoading: loadingClients } = useQuery({
    queryKey: ['postgen-clients'],
    queryFn: () => api.get('/clients?limit=200').then(r => r.data),
    staleTime: 120_000,
  });
  const clients = clientsData?.clients ?? [];

  useEffect(() => {
    if (!clientId && clients.length > 0) {
      setClientId(String(clients[0].id));
    }
  }, [clients, clientId]);

  const selectedClient = clients.find(c => String(c.id) === clientId);

  async function handleGenerate() {
    if (!clientId) { toast.error('Please select a client first'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/ai/generate-posts/${clientId}`, {
        month: month + 1,
        year,
        save_as_drafts: true,
      });
      setPosts(data.posts ?? []);
      setGenerated(true);
      toast.success(`Generated ${data.count} posts — saved as drafts`);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Generation failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" style={{ padding: '18px 22px', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} style={{ color: 'var(--accent-text)' }} />
          Generate Monthly Posts
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 220px' }}>
            <label className="label">Client</label>
            <select
              className="input"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              disabled={loadingClients}
            >
              {loadingClients
                ? <option>Loading…</option>
                : clients.map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.business_name}{c.city ? ` — ${c.city}` : ''}
                    </option>
                  ))
              }
            </select>
          </div>

          <div className="field" style={{ minWidth: 140 }}>
            <label className="label">Month</label>
            <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>

          <div className="field" style={{ minWidth: 100 }}>
            <label className="label">Year</label>
            <select className="input" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading || !clientId || loadingClients}
            style={{ height: 38, paddingLeft: 20, paddingRight: 20, gap: 8, flexShrink: 0 }}
          >
            {loading
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
              : <><Sparkles size={14} /> Generate 10 Posts</>
            }
          </button>

          {generated && !loading && (
            <button className="btn-ghost" onClick={handleGenerate} disabled={loading} style={{ height: 38, gap: 8 }}>
              <RefreshCw size={13} /> Regenerate
            </button>
          )}
        </div>

        {generated && !error && selectedClient && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--green-light)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={14} style={{ color: 'var(--green-text)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--green-text)', fontWeight: 500 }}>
              Generated {posts.length} posts for <strong>{selectedClient.business_name}</strong> — {MONTHS[month]} {year} · Saved as drafts
            </span>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} style={{ color: 'var(--red-text)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--red-text)' }}>{error}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 16 }}>
        {loading
          ? [...Array(10)].map((_, i) => (
              <div key={i} className="skeleton card" style={{ minHeight: 280 }} />
            ))
          : <>
              {posts.map((post, i) => (
                <PostCard key={post.id || i} post={post} index={i} />
              ))}
              {[...Array(Math.max(0, 10 - posts.length))].map((_, i) => (
                <PlaceholderCard key={i} number={posts.length + i + 1} />
              ))}
            </>
        }
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}