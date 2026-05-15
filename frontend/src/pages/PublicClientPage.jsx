import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FileText, Tag, CreditCard, CalendarDays, MapPin, ExternalLink, AlertCircle } from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

const POST_TYPE_COLOR = {
  update:  { bg: '#eff6ff', color: '#2563eb' },
  offer:   { bg: '#fefce8', color: '#ca8a04' },
  event:   { bg: '#f0fdf4', color: '#16a34a' },
  product: { bg: '#fdf4ff', color: '#9333ea' },
};

const STATUS_META = {
  published: { label: 'Published', bg: '#f0fdf4', color: '#16a34a' },
  scheduled:  { label: 'Scheduled', bg: '#fefce8', color: '#ca8a04' },
  draft:      { label: 'Draft',     bg: '#f3f4f6', color: '#6b7280' },
  failed:     { label: 'Failed',    bg: '#fef2f2', color: '#ef4444' },
};

function PostCard({ post }) {
  const tc = POST_TYPE_COLOR[post.post_type] || POST_TYPE_COLOR.update;
  const sm = STATUS_META[post.status] || STATUS_META.draft;
  const dateStr = fmtDate(post.published_at || post.scheduled_at);
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      overflow: 'hidden', transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '2px 8px', borderRadius: 20, background: tc.bg, color: tc.color }}>
              {post.post_type}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: sm.bg, color: sm.color }}>
              {sm.label}
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{dateStr}</span>
        </div>
        {post.title && (
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6, lineHeight: 1.35 }}>{post.title}</div>
        )}
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{post.content}</div>
        {post.call_to_action && post.cta_url && (
          <a
            href={post.cta_url}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 12, fontWeight: 600, color: '#6c3ef4', textDecoration: 'none' }}
          >
            {post.call_to_action} <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

export default function PublicClientPage() {
  const { token } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-client', token],
    queryFn: () => axios.get(`${BASE}/api/public/${token}`).then(r => r.data),
    retry: 1,
    staleTime: 60_000,
  });

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#6b7280' }}>Loading…</div>
    </div>
  );

  if (isError || !data) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <AlertCircle size={40} style={{ color: '#ef4444' }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Link not found</div>
      <div style={{ fontSize: 13, color: '#6b7280' }}>This share link is invalid or has been disabled.</div>
    </div>
  );

  const { client, billing, posts, keywords } = data;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {client.logo_url ? (
            <img src={client.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid #e5e7eb' }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#6c3ef4,#9b6dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
              {(client.business_name || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{client.business_name}</div>
            {client.city && (
              <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MapPin size={11} /> {client.city}
              </div>
            )}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6c3ef4', padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Powered by LocalIQ
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 48px' }}>
        {/* Plan + Next payment */}
        {billing && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 28 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={16} style={{ color: '#6c3ef4' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Plan</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{billing.plan_name || '—'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{fmtINR(billing.monthly_amount)} / month</div>
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarDays size={16} style={{ color: '#ca8a04' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Next Payment</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: billing.payment_status === 'overdue' ? '#ef4444' : '#111827' }}>
                  {fmtDate(billing.next_due_date)}
                </div>
                <div style={{ fontSize: 12, color: billing.payment_status === 'overdue' ? '#ef4444' : '#6b7280', fontWeight: billing.payment_status === 'overdue' ? 600 : 400 }}>
                  {billing.payment_status === 'paid' ? 'Paid' : billing.payment_status === 'overdue' ? 'Overdue' : 'Upcoming'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Keywords */}
        {keywords.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 28, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={15} style={{ color: '#6c3ef4' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Target Keywords</span>
              <span style={{ fontSize: 11, background: '#ede9fe', color: '#6c3ef4', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>
                {keywords.length}
              </span>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {keywords.map((k, i) => (
                <span key={i} style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20,
                  background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb',
                }}>
                  {k.keyword}
                  {k.volume ? <span style={{ color: '#9ca3af', marginLeft: 5 }}>· {k.volume.toLocaleString('en-IN')}</span> : null}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Posts */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <FileText size={15} style={{ color: '#6c3ef4' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Posts
            </span>
            <span style={{ fontSize: 11, background: '#ede9fe', color: '#6c3ef4', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>
              {posts.length}
            </span>
          </div>
          {posts.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              No posts this month yet
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
              {posts.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '16px 0 32px', fontSize: 11, color: '#9ca3af' }}>
        Managed by Ampwake Group · LocalIQ
      </div>
    </div>
  );
}
