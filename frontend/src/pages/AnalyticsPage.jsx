import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, subDays } from 'date-fns';
import { Plus } from 'lucide-react';
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

  const mut = useMutation({
    mutationFn: data => api.post('/analytics/client', { client_id: clientId, ...data }),
    onSuccess: () => { toast.success('Data saved'); onSaved(); },
    onError:   e  => toast.error(e.response?.data?.error || 'Failed')
  });

  const F = ({ label, field }) => (
    <div className="field">
      <label className="label">{label}</label>
      <input type="number" min="0" className="input"
        value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
    </div>
  );

  return (
    <div className="p-5 space-y-4">
      <div className="field">
        <label className="label">Date</label>
        <input type="date" className="input" value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button className="btn-primary flex-1" disabled={mut.isPending}
          onClick={() => mut.mutate(form)}>
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

  const { data, isLoading, refetch } = useQuery({
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

  return (
    <div className="page py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="page-title">Analytics</h1>
        <div className="flex gap-2">
          {clientId && (
            <button className="btn-secondary text-sm" onClick={() => setEntryModal(true)}>
              <Plus className="w-4 h-4" /> Log Data
            </button>
          )}
        </div>
      </div>

      {/* Selectors */}
      <div className="card p-3.5 mb-5 flex flex-wrap gap-3">
        <select className="input w-52" value={clientId} onChange={e => setClientId(e.target.value)}>
          <option value="">Select client…</option>
          {cData?.clients?.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
        </select>
        <select className="input w-36" value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {!clientId ? (
        <div className="card py-16 text-center text-gray-400 text-sm">
          Select a client to view analytics
        </div>
      ) : isLoading ? (
        <div className="card py-16 text-center text-gray-400 text-sm animate-pulse">Loading…</div>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Search Views',   value: t.total_views_search,     color: 'text-blue-600' },
              { label: 'Maps Views',     value: t.total_views_maps,       color: 'text-green-600' },
              { label: 'Website Clicks', value: t.total_clicks_website,   color: 'text-purple-600' },
              { label: 'New Reviews',    value: t.total_new_reviews,      color: 'text-yellow-600' }
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>
                  {(value ?? 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {data?.analytics?.length > 0 ? (
            <>
              {/* Views chart */}
              <div className="card p-5 mb-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Profile Views</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.analytics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="views_search" stroke="#6366f1" name="Search" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="views_maps"   stroke="#10b981" name="Maps"   dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Clicks chart */}
              <div className="card p-5 mb-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Customer Actions</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.analytics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="clicks_website"    fill="#6366f1" name="Website"    radius={[3,3,0,0]} />
                    <Bar dataKey="clicks_phone"      fill="#10b981" name="Phone"      radius={[3,3,0,0]} />
                    <Bar dataKey="clicks_directions" fill="#f59e0b" name="Directions" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="card py-12 text-center text-sm text-gray-400 mb-5">
              No analytics data for this period.{' '}
              <button className="text-brand-600 hover:underline" onClick={() => setEntryModal(true)}>
                Log some data
              </button>
            </div>
          )}

          {/* Review distribution */}
          {reviewStats?.distribution?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Review Distribution</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={reviewStats.distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="rating" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Review Trend</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={[...( reviewStats.monthly ?? [])].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count"      stroke="#6366f1" name="Reviews"    dot={false} />
                    <Line type="monotone" dataKey="avg_rating" stroke="#f59e0b" name="Avg Rating" dot={false} />
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
