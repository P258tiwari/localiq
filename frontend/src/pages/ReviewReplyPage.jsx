import { useState } from 'react';
import {
  Star, Sparkles, Copy, Check, Loader2, RefreshCw,
  User, ChevronDown, MessageCircle
} from 'lucide-react';

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'warm',         label: 'Warm & Friendly' },
  { value: 'apologetic',   label: 'Apologetic' },
  { value: 'brief',        label: 'Brief' },
];

const MOCK_RESULT = {
  full_reply: "Thank you so much, Rahul! We're absolutely thrilled to hear that your experience at Sharma Dental Clinic exceeded your expectations. Our team works tirelessly to ensure every patient feels comfortable and well-cared for, and your kind words genuinely motivate us. Dr. Sharma and the entire team are grateful for your trust. We look forward to continuing to be your preferred dental care provider in New Delhi. Your smile is our greatest reward!",
  short_reply: "Thank you, Rahul! We're glad you had a great experience. Your trust means the world to us!",
  professional_version: "Thank you for your wonderful feedback, Rahul. We are pleased to know that your visit to Sharma Dental Clinic met your expectations. Providing exceptional dental care in New Delhi remains our top priority, and reviews like yours reinforce our commitment to excellence.",
  warm_version: "Oh wow, thank you so much, Rahul! This made our whole day! 😊 We absolutely love caring for patients like you and can't wait to see your bright smile again. You're always welcome at Sharma Dental Clinic!",
};

const RECENT_REVIEWS = [
  { id: 1, reviewer: 'Rahul Sharma', rating: 5, text: 'Best dental clinic in Delhi! Dr. Sharma is amazing and the staff is incredibly helpful.', date: '2025-05-08', client: 'Sharma Dental Clinic' },
  { id: 2, reviewer: 'Priya Mehta',  rating: 4, text: 'Great experience overall. Waiting time was a bit long but the treatment was excellent.', date: '2025-05-03', client: 'Sharma Dental Clinic' },
  { id: 3, reviewer: 'Ankit Joshi',  rating: 2, text: 'Staff was rude and the clinic was not very clean. Disappointed with my visit.', date: '2025-04-28', client: 'Greenleaf Cafe' },
  { id: 4, reviewer: 'Sunita Rao',   rating: 5, text: 'Perfect coffee and amazing ambience! Best cafe in Mumbai, highly recommend.',  date: '2025-04-25', client: 'Greenleaf Cafe' },
];

function StarRating({ rating, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
        >
          <Star
            size={size}
            style={{
              color: i <= (hover || rating) ? 'var(--yellow-text)' : 'var(--border)',
              fill:  i <= (hover || rating) ? 'var(--yellow-text)' : 'transparent',
              transition: 'all 0.1s',
            }}
          />
        </button>
      ))}
    </div>
  );
}

function CopyBtn({ text, label = 'Copy' }) {
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
        border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
        color: copied ? 'var(--green-text)' : 'var(--text-secondary)',
        borderRadius: 6, padding: '5px 10px',
        cursor: 'pointer', fontSize: 12,
        display: 'flex', alignItems: 'center', gap: 5,
        transition: 'all 0.15s',
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function ReplyCard({ title, text, color = 'var(--text-primary)', accent = false }) {
  return (
    <div className="card" style={{
      padding: '16px 18px',
      ...(accent ? { border: '1px solid rgba(108,62,244,0.3)', background: 'var(--accent-light)' } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: accent ? 'var(--accent-text)' : 'var(--text-muted)' }}>
          {title}
        </div>
        <CopyBtn text={text} />
      </div>
      <p style={{ fontSize: 13, color: accent ? 'var(--accent-text)' : 'var(--text-secondary)', lineHeight: 1.7 }}>
        {text}
      </p>
    </div>
  );
}

export default function ReviewReplyPage() {
  const [rating, setRating]         = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [businessName, setBusiness] = useState('Sharma Dental Clinic');
  const [tone, setTone]             = useState('professional');
  const [keyword, setKeyword]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [selected, setSelected]     = useState(null);
  const [showRecent, setShowRecent] = useState(false);

  async function handleGenerate() {
    if (!reviewText.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1600));
    setResult(MOCK_RESULT);
    setLoading(false);
  }

  function loadReview(r) {
    setRating(r.rating);
    setReviewText(r.text);
    setBusiness(r.client);
    setSelected(r.id);
    setResult(null);
    setShowRecent(false);
  }

  const ratingLabel = ['', 'Critical', 'Poor', 'Neutral', 'Good', 'Excellent'][rating] || '';
  const ratingColor = rating >= 4 ? 'var(--green-text)' : rating === 3 ? 'var(--yellow-text)' : 'var(--red-text)';

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="review-layout" style={{ alignItems: 'start' }}>
        {/* Left panel — input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Review input card */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={14} style={{ color: 'var(--accent-text)' }} />
              Review Details
            </div>

            {/* Star rating */}
            <div className="field" style={{ marginBottom: 18 }}>
              <label className="label">Star Rating</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
                <StarRating rating={rating} onChange={setRating} />
                <span style={{ fontSize: 13, fontWeight: 600, color: ratingColor, fontFamily: 'DM Mono, monospace' }}>
                  {rating}/5 — {ratingLabel}
                </span>
              </div>
            </div>

            {/* Review text */}
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="label">Review Text</label>
              <textarea
                className="input"
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Paste the customer review here…"
                style={{ height: 110, resize: 'vertical', marginTop: 4 }}
              />
            </div>

            {/* Business name */}
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="label">Business Name</label>
              <input
                className="input"
                value={businessName}
                onChange={e => setBusiness(e.target.value)}
                placeholder="Your Business Name"
                style={{ marginTop: 4 }}
              />
            </div>

            {/* Keyword */}
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="label">Include Keyword (optional)</label>
              <input
                className="input"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="e.g. dentist in new delhi"
                style={{ marginTop: 4 }}
              />
            </div>
          </div>

          {/* Tone selector */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <label className="label" style={{ marginBottom: 12, display: 'block' }}>Response Tone</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {TONE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 8,
                    border: `1px solid ${tone === t.value ? 'rgba(108,62,244,0.5)' : 'var(--border)'}`,
                    background: tone === t.value ? 'var(--accent-light)' : 'var(--bg-input)',
                    color: tone === t.value ? 'var(--accent-text)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading || !reviewText.trim()}
            style={{ height: 44, fontSize: 15, gap: 10 }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Generating reply…
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate AI Reply
              </>
            )}
          </button>

          {result && (
            <button className="btn-ghost" onClick={handleGenerate} style={{ height: 38, gap: 8 }}>
              <RefreshCw size={13} /> Regenerate
            </button>
          )}

          {/* Recent reviews */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <button
              onClick={() => setShowRecent(v => !v)}
              style={{ width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={13} style={{ color: 'var(--text-muted)' }} />
                Recent Reviews ({RECENT_REVIEWS.length})
              </span>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: showRecent ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showRecent && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {RECENT_REVIEWS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => loadReview(r)}
                    style={{
                      width: '100%', padding: '12px 18px', background: selected === r.id ? 'var(--accent-light)' : 'none',
                      border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (selected !== r.id) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                    onMouseLeave={e => { if (selected !== r.id) e.currentTarget.style.background = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{r.reviewer}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={10} style={{ color: i < r.rating ? 'var(--yellow-text)' : 'var(--border)' }} />
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {r.text}
                    </p>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>{r.client}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — output */}
        <div>
          {!result && !loading && (
            <div style={{
              height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '1.5px dashed var(--border)', borderRadius: 12, gap: 12,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} style={{ color: 'var(--accent-text)' }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>AI Reply Generator</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280 }}>
                Enter a review on the left and click "Generate AI Reply" to get 4 reply variants
              </div>
            </div>
          )}

          {loading && (
            <div style={{
              height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid var(--border)', borderRadius: 12, gap: 12,
            }}>
              <Loader2 size={32} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Crafting perfect replies…</div>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                4 reply variants generated · Tone: <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>{TONE_OPTIONS.find(t => t.value === tone)?.label}</span>
              </div>
              <ReplyCard title="Full Reply (Recommended)" text={result.full_reply} accent />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ReplyCard title="Short Reply" text={result.short_reply} />
                <ReplyCard title="Professional" text={result.professional_version} />
              </div>
              <ReplyCard title="Warm & Friendly" text={result.warm_version} />
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
