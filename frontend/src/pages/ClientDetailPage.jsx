import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star, FileText, BarChart2, Pencil, ExternalLink, Globe, Phone, MapPin } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import ClientForm from '../components/ClientForm';
import clsx from 'clsx';

const TABS = ['Overview', 'Reviews', 'Posts'];

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={clsx('w-3.5 h-3.5', s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200')} />
      ))}
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('Overview');
  const [editModal, setEditModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get(`/clients/${id}`).then(r => r.data)
  });

  const client = data?.client;

  if (isLoading) return <div className="page py-6 text-center text-gray-400">Loading…</div>;
  if (!client)   return <div className="page py-6 text-center text-gray-400">Client not found</div>;

  const stats = client.stats ?? {};

  return (
    <div className="page py-6">
      <button onClick={() => navigate('/clients')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </button>

      {/* Hero */}
      <div className="card p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-brand-100 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold text-brand-700">
            {client.business_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-lg font-bold text-gray-900">{client.business_name}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {client.category && <span className="badge-blue">{client.category}</span>}
                  <span className={clsx('badge', client.status === 'active' ? 'badge-green' : client.status === 'prospect' ? 'badge-yellow' : 'badge-gray')}>
                    {client.status}
                  </span>
                  {client.assigned_to_name && (
                    <span className="text-xs text-gray-400">Managed by {client.assigned_to_name}</span>
                  )}
                </div>
              </div>
              <button className="btn-secondary text-xs py-1.5 shrink-0" onClick={() => setEditModal(true)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </div>

            <div className="flex flex-wrap gap-4 mt-3">
              {client.city && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />{client.city}{client.state ? `, ${client.state}` : ''}
                </span>
              )}
              {client.gbp_phone && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />{client.gbp_phone}
                </span>
              )}
              {client.website && (
                <a href={client.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
                  <Globe className="w-3.5 h-3.5" />{client.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {client.gbp_url && (
                <a href={client.gbp_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> Google Listing
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
          {[
            { label: 'Total Reviews',   value: stats.total_reviews  ?? 0 },
            { label: 'Avg Rating',      value: stats.avg_rating     ?? '—' },
            { label: 'Pending Replies', value: stats.pending_replies ?? 0, red: true },
            { label: 'Positive',        value: stats.positive_reviews ?? 0 }
          ].map(({ label, value, red }) => (
            <div key={label} className="text-center">
              <p className={clsx('text-xl font-bold', red && value > 0 ? 'text-red-600' : 'text-gray-900')}>
                {value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === t ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact</h3>
            <dl className="space-y-2 text-sm">
              {[
                ['Contact Name',  client.contact_name],
                ['Contact Email', client.contact_email],
                ['Contact Phone', client.contact_phone],
                ['Address',       [client.address, client.city, client.state, client.pincode].filter(Boolean).join(', ')],
                ['Notes',         client.notes]
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-gray-400 w-28 shrink-0">{k}</dt>
                  <dd className="text-gray-700">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link to={`/reviews?client_id=${id}`} className="btn-secondary w-full justify-start text-sm">
                <Star className="w-4 h-4 text-yellow-400" /> View Reviews
              </Link>
              <Link to={`/posts?client_id=${id}`} className="btn-secondary w-full justify-start text-sm">
                <FileText className="w-4 h-4 text-brand-500" /> View Posts
              </Link>
              <Link to={`/analytics?client_id=${id}`} className="btn-secondary w-full justify-start text-sm">
                <BarChart2 className="w-4 h-4 text-green-500" /> View Analytics
              </Link>
            </div>
          </div>
        </div>
      )}

      {tab === 'Reviews' && (
        <div className="card tbl-divider">
          {client.recentReviews?.length ? client.recentReviews.map(r => (
            <div key={r.id} className="tbl-row">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                {r.reviewer_name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 justify-between">
                  <span className="text-sm font-medium text-gray-900">{r.reviewer_name}</span>
                  <StarRow rating={r.rating} />
                </div>
                {r.comment && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.comment}</p>}
              </div>
              <span className={r.is_replied ? 'badge-green' : 'badge-yellow'}>
                {r.is_replied ? 'Replied' : 'Pending'}
              </span>
            </div>
          )) : (
            <div className="py-12 text-center text-sm text-gray-400">No reviews yet</div>
          )}
          <div className="px-5 py-3 border-t border-gray-100">
            <Link to={`/reviews?client_id=${id}`} className="text-xs text-brand-600 hover:underline">
              View all reviews →
            </Link>
          </div>
        </div>
      )}

      {tab === 'Posts' && (
        <div className="card tbl-divider">
          {client.recentPosts?.length ? client.recentPosts.map(p => (
            <div key={p.id} className="tbl-row">
              <div className="flex-1 min-w-0">
                {p.title && <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>}
                <p className="text-xs text-gray-500 line-clamp-2">{p.content}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={clsx('badge', p.status === 'published' ? 'badge-green' : p.status === 'scheduled' ? 'badge-blue' : 'badge-gray')}>
                  {p.status}
                </span>
              </div>
            </div>
          )) : (
            <div className="py-12 text-center text-sm text-gray-400">No posts yet</div>
          )}
          <div className="px-5 py-3 border-t border-gray-100">
            <Link to={`/posts?client_id=${id}`} className="text-xs text-brand-600 hover:underline">
              View all posts →
            </Link>
          </div>
        </div>
      )}

      {editModal && (
        <Modal title="Edit Client" onClose={() => setEditModal(false)} size="lg">
          <ClientForm
            client={client}
            onSaved={() => { setEditModal(false); qc.invalidateQueries(['client', id]); qc.invalidateQueries(['clients']); }}
            onCancel={() => setEditModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
