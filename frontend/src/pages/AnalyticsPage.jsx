import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, subDays } from 'date-fns';
import { Plus, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

function EntryModal({ clientId, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today, views_search: '', views_maps: '',
    clicks_website: '', clicks_phone: '', clicks_directions: '',
    photo_views: '', new_reviews: '', avg_rating: ''
  });
  const [errors, setErrors] = useState({});

  const mut = useMutation({
    mutationFn: data => api.post('/analytics/client', { client_id: clientId, ...data }),
    onSuccess: () => { toast.success('Data saved'); onSaved(); },
    onError: e => toast.error(e.response?.data?.error || 'Failed to save')
  });

  function submit() {
    const e = {};
    if (!form.date) e.date = 'Date is required';
    if (Object.keys(e).length) { setErrors(e); return; }
    mut.mutate(form);
  }

  const F = ({ label, field }) => (
    <div className="field">
      <label className="label">{label}</label>
      <input type="number" min="0" className="input"
        value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
    </div>
  );

  return (
    <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field">
        <label className="label">Date *</label>
        <input type="date" className={`input ${errors.date ? 'input-error' : ''}`} value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        {errors.date && <div className="field-error"><AlertCircle size={11} />{errors.date}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <F label="Search Views"      field="views_search" />
        <F label="Maps Views"        field="views_maps" />
        <F label="Website Clicks"    field="clicks_website" />
        <F label="Phone Clicks"      field="clicks_phone" />
        <F label="Direction Clicks"  field="clicks_directions" />
        <F label="Photo Views"       field="photo_views" />
        <F label="New Reviews"       field="new_reviews" />
        <div className="field">
          <label className="label">Avg Rating</label>
          <input type="number" min="1" max="5" step="0.1" className="input"
            value={form.avg_rating} onChange={e => setForm(f => ({ ...f, avg_rating: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        <button className="btn-primary" style={{ flex: 1 }} disabled={mut.isPending} onClick={submit}>
          {mut.isPending ? 'Saving…' : 'Save Data'}
        </button>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [sp] = useSearchParams();
  const [clientId, setClientId] = useState(sp.get('client_id') || '');
  const [days, setDays]         = useState(30);
  const [entryModal, setEntryModal] = useState(false);

  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
  const endDate   = format(new Date(), 'yyyy-MM-dd');

  const { data: cData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients', { params: { limit: 100 } }).then(r => r.data)
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', clientId, days],
    queryFn: () => api.get('/analytics/client', {
      params: { client_id: clientId, start_date: startDate, end_date: endDate }
    }).then(r => r.data),
    enabled: !!clientId
  });

  const { data: reviewStats } = useQuery({
    queryKey: ['review-stats', clientId],
    queryFn: () => api.get('/reviews/stats', { params: { client_id: clientId } }).then(r => r.data),
    enabled: !!clientId
  });

  const t = data?.totals ?? {};

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' };
  const headStyle = { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 };

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Analytics</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Track GBP performance across clients</div>
        </div>
        {clientId && (
          <button className="btn-ghost" style={{ gap: 6, fontSize: 13 }} onClick={() => setEntryModal(true)}>
            <Plus size={14} /> Log Data
          </button>
        )}
      </div>

      {/* Selectors */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <select className="input" style={{ width: 200 }} value={clientId} onChange={e => setClientId(e.target.value)}>
          <option value="">Select client…</option>
          {cData?.clients?.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
        </select>
        <select className="input" style={{ width: 140 }} value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* No client selected */}
      {!clientId && (
        <div className="card empty-state">
          <div className="empty-state-emoji">📈</div>
          <div className="empty-state-title">Select a client</div>
          <div className="empty-state-sub">Choose a client above to view their GBP analytics</div>
        </div>
      )}

      {/* Loading skeleton */}
      {clientId && isLoading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton card" style={{ height: 80 }} />)}
          </div>
          <div className="skeleton card" style={{ height: 260, marginBottom: 16 }} />
          <div className="skeleton card" style={{ height: 260 }} />
        </>
      )}

      {/* Error state */}
      {clientId && isError && (
        <div className="card error-state">
          <div className="error-state-emoji">⚠️</div>
          <div className="error-state-title">Failed to load analytics</div>
          <div className="error-state-sub">Check your connection and try again</div>
          <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Data */}
      {clientId && !isLoading && !isError && (
        <>
          {/* Summary tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Search Views',   value: t.total_views_search,   color: 'var(--accent-text)'  },
              { label: 'Maps Views',     value: t.total_views_maps,     color: 'var(--green-text)'   },
              { label: 'Website Clicks', value: t.total_clicks_website, color: '#7C3AED'             },
              { label: 'New Reviews',    value: t.total_new_reviews,    color: 'var(--yellow-text)'  },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...cardStyle }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>{(value ?? 0).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>

          {data?.analytics?.length > 0 ? (
            <>
              {/* Views chart */}
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={headStyle}>Profile Views</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.analytics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="views_search" stroke="var(--accent)" name="Search" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="views_maps"   stroke="var(--green-text)" name="Maps" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Clicks chart */}
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={headStyle}>Customer Actions</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.analytics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="clicks_website"    fill="var(--accent)"       name="Website"    radius={[3,3,0,0]} />
                    <Bar dataKey="clicks_phone"      fill="var(--green-text)"   name="Phone"      radius={[3,3,0,0]} />
                    <Bar dataKey="clicks_directions" fill="var(--yellow-text)"  name="Directions" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="card empty-state" style={{ marginBottom: 16 }}>
              <div className="empty-state-emoji">📉</div>
              <div className="empty-state-title">No analytics data for this period</div>
              <div className="empty-state-sub">Log performance data manually or connect your GBP account</div>
              <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setEntryModal(true)}>Log Data</button>
            </div>
          )}

          {/* Review distribution */}
          {reviewStats?.distribution?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div style={cardStyle}>
                <div style={headStyle}>Review Distribution</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={reviewStats.distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="rating" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" fill="var(--accent)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={cardStyle}>
                <div style={headStyle}>Monthly Review Trend</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={[...( reviewStats.monthly ?? [])].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="count"      stroke="var(--accent)"       name="Reviews"    dot={false} />
                    <Line type="monotone" dataKey="avg_rating" stroke="var(--yellow-text)"  name="Avg Rating" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {entryModal && (
        <Modal title="Log Analytics Data" onClose={() => setEntryModal(false)}>
          <EntryModal
            clientId={clientId}
            onClose={() => setEntryModal(false)}
            onSaved={() => { setEntryModal(false); refetch(); }}
          />
        </Modal>
      )}
    </div>
  );
}
