import { useState } from 'react';
import {
  Sparkles, Copy, Check, Image, CalendarDays, Tag,
  ChevronDown, Loader2, RefreshCw, Wand2
} from 'lucide-react';

const CLIENTS = [
  { id: 1, name: 'Sharma Dental Clinic',  city: 'New Delhi'   },
  { id: 2, name: 'Greenleaf Cafe',         city: 'Mumbai'      },
  { id: 3, name: 'TechFix Solutions',      city: 'Bangalore'   },
  { id: 4, name: 'Sunrise Physio',         city: 'Pune'        },
  { id: 5, name: 'Royal Sweets',           city: 'Jaipur'      },
  { id: 6, name: 'FastPrint Studios',      city: 'Hyderabad'   },
];

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const MOCK_POSTS = [
  {
    id: 1,
    post_title: 'World Oral Health Day — Free Checkup Offer',
    post_heading: 'Celebrate World Oral Health Day With Us',
    post_description: 'This World Oral Health Day, Sharma Dental Clinic offers FREE dental checkups for new patients! Visit us in New Delhi and let our experts craft your perfect smile. Limited slots available — book now.',
    cta_text: 'BOOK_APPOINTMENT',
    post_type: 'offer',
    suggested_date: '2025-05-12',
    suggested_time: '10:00',
    keywords_used: ['dentist in new delhi', 'free dental checkup'],
    image_prompt: 'A bright and clean modern dental clinic reception with a friendly dentist, warm lighting, no text, photorealistic',
    target_service: 'General Dentistry',
    target_area: 'New Delhi',
  },
  {
    id: 2,
    post_title: 'Dental Implants — Restore Your Smile',
    post_heading: 'Missing a Tooth? Get Permanent Implants',
    post_description: 'Dental implants are the gold standard for tooth replacement. At Sharma Dental Clinic, our experienced team uses the latest technology for pain-free implant procedures. 98% success rate. EMI available.',
    cta_text: 'LEARN_MORE',
    post_type: 'update',
    suggested_date: '2025-05-16',
    suggested_time: '09:00',
    keywords_used: ['dental implants delhi', 'dental implants delhi cost'],
    image_prompt: 'Close-up of a perfect smile with dental implants, studio lighting, clean white background, no text',
    target_service: 'Dental Implants',
    target_area: 'New Delhi',
  },
  {
    id: 3,
    post_title: 'Teeth Whitening — Dazzle This Wedding Season',
    post_heading: 'Get a Brighter Smile in Just 60 Minutes',
    post_description: 'Wedding season is here! Our professional teeth whitening treatment delivers 6–8 shades brighter in one session. Safe, quick, and long-lasting. Walk in with a smile, walk out with a glow.',
    cta_text: 'CALL_NOW',
    post_type: 'offer',
    suggested_date: '2025-05-20',
    suggested_time: '11:00',
    keywords_used: ['teeth whitening delhi'],
    image_prompt: 'Beautiful smiling woman with bright white teeth, soft natural lighting, wedding background, no text, photorealistic',
    target_service: 'Teeth Whitening',
    target_area: 'New Delhi',
  },
  {
    id: 4,
    post_title: 'Orthodontics for Adults — It\'s Never Too Late',
    post_heading: 'Braces & Aligners for Adults in Delhi',
    post_description: 'Think braces are only for teenagers? Think again. Our adult orthodontic program offers invisible aligners and discreet braces. Start your alignment journey today at Sharma Dental Clinic.',
    cta_text: 'GET_OFFER',
    post_type: 'update',
    suggested_date: '2025-05-24',
    suggested_time: '10:30',
    keywords_used: ['orthodontist delhi', 'dental clinic near me'],
    image_prompt: 'Happy adult wearing clear dental aligners, professional portrait, modern clinic background, no text',
    target_service: 'Orthodontics',
    target_area: 'New Delhi',
  },
];

const CTA_LABELS = {
  BOOK_APPOINTMENT: 'Book Appointment',
  LEARN_MORE:       'Learn More',
  CALL_NOW:         'Call Now',
  GET_OFFER:        'Get Offer',
  SHOP_NOW:         'Shop Now',
};

const POST_TYPE_COLOR = {
  offer:   { bg: 'var(--yellow-light)', color: 'var(--yellow-text)' },
  update:  { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
  event:   { bg: 'var(--green-light)',  color: 'var(--green-text)'  },
  product: { bg: '#1A1A1A',            color: 'var(--text-secondary)' },
};

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
      title="Copy to clipboard"
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

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Card header */}
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: typeStyle.bg, color: typeStyle.color, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {post.post_type}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={10} />
              {new Date(post.suggested_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {post.suggested_time}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {post.post_heading || post.post_title}
          </div>
        </div>
        <span style={{
          fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '2px 8px', flexShrink: 0,
        }}>
          #{index + 1}
        </span>
      </div>

      {/* Post body */}
      <div style={{ padding: '14px 18px', flex: 1 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
          {post.post_description}
        </p>

        {/* Keywords */}
        {post.keywords_used?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {post.keywords_used.map(kw => (
              <span key={kw} style={{ fontSize: 11, color: 'var(--accent-text)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tag size={9} /> {kw}
              </span>
            ))}
          </div>
        )}

        {/* Image prompt */}
        {post.image_prompt && (
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setShowPrompt(v => !v)}
              style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Image size={12} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, textAlign: 'left' }}>Image prompt (DALL-E)</span>
              <ChevronDown size={12} style={{ color: 'var(--text-muted)', transform: showPrompt ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showPrompt && (
              <div style={{ padding: '0 12px 10px' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', lineHeight: 1.6 }}>
                  {post.image_prompt}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          CTA: <span style={{ color: 'var(--accent-text)', fontWeight: 500 }}>{CTA_LABELS[post.cta_text] || post.cta_text}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CopyBtn text={`${post.post_heading}\n\n${post.post_description}`} small />
          <button
            style={{
              background: 'var(--accent-light)', border: '1px solid rgba(108,62,244,0.3)',
              color: 'var(--accent-text)', borderRadius: 6, padding: '5px 10px',
              cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Wand2 size={11} /> Save Draft
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({ number }) {
  return (
    <div style={{
      border: '1.5px dashed var(--border)',
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 8,
      minHeight: 200,
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
  const [clientId, setClientId] = useState('1');
  const [month, setMonth]       = useState(new Date().getMonth());
  const [year, setYear]         = useState(new Date().getFullYear());
  const [loading, setLoading]   = useState(false);
  const [posts, setPosts]       = useState(MOCK_POSTS);
  const [generated, setGenerated] = useState(true);

  async function handleGenerate() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setPosts(MOCK_POSTS);
    setGenerated(true);
    setLoading(false);
  }

  const client = CLIENTS.find(c => String(c.id) === clientId);

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* Controls card */}
      <div className="card" style={{ padding: '18px 22px', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} style={{ color: 'var(--accent-text)' }} />
          Generate Monthly Posts
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 220px' }}>
            <label className="label">Client</label>
            <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
              {CLIENTS.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 140 }}>
            <label className="label">Month</label>
            <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 100 }}>
            <label className="label">Year</label>
            <select className="input" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
            style={{ height: 38, paddingLeft: 20, paddingRight: 20, gap: 8, flexShrink: 0 }}
          >
            {loading ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate 10 Posts
              </>
            )}
          </button>
          {generated && (
            <button className="btn-ghost" onClick={handleGenerate} style={{ height: 38, gap: 8 }}>
              <RefreshCw size={13} /> Regenerate
            </button>
          )}
        </div>

        {generated && client && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--green-light)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--green-text)', fontWeight: 500 }}>
              ✓ Generated 10 posts for <strong>{client.name}</strong> — {MONTHS[month]} {year}
            </span>
          </div>
        )}
      </div>

      {/* Posts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} index={i} />
        ))}
        {[...Array(Math.max(0, 10 - posts.length))].map((_, i) => (
          <PlaceholderCard key={i} number={posts.length + i + 1} />
        ))}
      </div>

      {generated && posts.length > 0 && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn-primary"
            style={{ paddingLeft: 32, paddingRight: 32, height: 44, fontSize: 15 }}
          >
            Save All as Drafts
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
