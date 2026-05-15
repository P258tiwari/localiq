import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Star, Sparkles, MessageSquare, Plus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Modal from '../components/Modal';

function Stars({ n }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={clsx('w-3.5 h-3.5', s <= n ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200')} />
      ))}
    </div>
  );
}

function AddReviewModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ reviewer_name: '', rating: '5', comment: '', review_date: new Date().toISOString().split('T')[0], client_id: '' });
  const { data: cData } = useQuery({ queryKey: ['clients-list'], queryFn: () => api.get('/clients', { params: { limit: 100 } }).then(r => r.data) });

  const mut = useMutation({
    mutationFn: data => api.post('/reviews', data),
    onSuccess: () => { toast.success('Review added'); onSaved(); },
    onError: e => toast.error(e.response?.data?.error || 'Failed')
  });

  return (
    <div className="p-5 space-y-4">
      <div className="field">
        <label className="label">Client *</label>
        <select className="input" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
          <option value="">Select client…</option>
          {cData?.clients?.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label className="label">Reviewer Name *</label>
          <input className="input" value={form.reviewer_name} onChange={e => setForm(f => ({ ...f, reviewer_name: e.target.value }))} />
        </div>
        <div className="field">
          <label className="label">Rating *</label>
          <select className="input" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}>
            {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label className="label">Review Text</label>
        <textarea className="input" rows={3} value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} />
      </div>
      <div className="field">
        <label className="label">Review Date</label>
        <input type="date" className="input" value={form.review_date} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} />
      </div>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button className="btn-primary flex-1" disabled={mut.isPending || !form.client_id || !form.reviewer_name}
          onClick={() => mut.mutate({ ...form, rating: Number(form.rating) })}>
          {mut.isPending ? 'Adding…' : 'Add Review'}
        </button>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const [sp] = useSearchParams();
  const [clientId, setClientId] = useState(sp.get('client_id') || '');
  const [rating, setRating] = useState('');
  const [isReplied, setIsReplied] = useState('');
  const [replyText, setReplyText] = useState({});
  const [suggesting, setSuggesting] = useState({});
  const [addModal, setAddModal] = useState(false);
  const qc = useQueryClient();

  const { data: cData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients', { params: { limit: 100 } }).then(r => r.data)
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reviews', clientId, rating, isReplied],
    queryFn: () => api.get('/reviews', {
      params: {
        client_id: clientId || undefined,
        rating: rating || undefined,
        is_replied: isReplied !== '' ? isReplied : undefined,
        limit: 50
      }
    }).then(r => r.data)
  });

  const replyMut = useMutation({
    mutationFn: ({ id, reply }) => api.post(`/reviews/${id}/reply`, { reply }),
    onSuccess: (_, { id }) => {
      toast.success('Reply posted');
      setReplyText(t => ({ ...t, [id]: '' }));
      qc.invalidateQueries(['reviews']);
    }
  });

  const suggest = async id => {
    setSuggesting(s => ({ ...s, [id]: true }));
    try {
      const { data } = await api.post(`/reviews/${id}/suggest-reply`);
      setReplyText(t => ({ ...t, [id]: data.suggestion }));
      toast.success('AI suggestion ready');
    } catch { toast.error('AI suggestion failed'); }
    finally { setSuggesting(s => ({ ...s, [id]: false })); }
  };

  const s = data?.stats ?? {};

  return (
    <div className="page py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Reviews</h1>
          {data && (
            <p className="page-sub">
              {s.total} total · {Number(s.avg_rating || 0).toFixed(1)} avg · {s.replied_count} replied
            </p>
          )}
        </div>
        <button className="btn-primary" onClick={() => setAddModal(true)}>
          <Plus className="w-4 h-4" /> Add Review
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3.5 mb-4 flex flex-wrap gap-3">
        <select className="input w-48" value={clientId} onChange={e => setClientId(e.target.value)}>
          <option value="">All Clients</option>
          {cData?.clients?.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
        </select>
        <select className="input w-28" value={rating} onChange={e => setRating(e.target.value)}>
          <option value="">All Ratings</option>
          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
        </select>
        <select className="input w-36" value={isReplied} onChange={e => setIsReplied(e.target.value)}>
          <option value="">All</option>
          <option value="false">Needs Reply</option>
          <option value="true">Replied</option>
        </select>
      </div>

      {/* Error state */}
      {isError && (
        <div className="card error-state">
          <div className="error-state-emoji">⚠️</div>
          <div className="error-state-title">Failed to load reviews</div>
          <div className="error-state-sub">Check your connection and try again</div>
          <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {isLoading ? [...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-full" />
          </div>
        )) : data?.reviews?.map(rev => (
          <div key={rev.id} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                {rev.reviewer_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{rev.reviewer_name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(rev.review_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars n={rev.rating} />
                    <span className={rev.is_replied ? 'badge-green' : 'badge-yellow'}>
                      {rev.is_replied ? 'Replied' : 'Pending'}
                    </span>
                  </div>
                </div>
                {rev.business_name && (
                  <p className="text-xs text-gray-400 mt-0.5">{rev.business_name}</p>
                )}
                {rev.comment && (
                  <p className="text-sm text-gray-600 mt-2">{rev.comment}</p>
                )}

                {/* Existing reply */}
                {rev.reply && (
                  <div className="mt-3 pl-3 border-l-2 border-brand-200 bg-brand-50 rounded-r-lg p-3">
                    <p className="text-xs font-semibold text-brand-600 mb-1">Your Reply</p>
                    <p className="text-sm text-gray-700">{rev.reply}</p>
                  </div>
                )}

                {/* Reply box */}
                {!rev.is_replied && (
                  <div className="mt-3 space-y-2">
                    <textarea className="input text-sm" rows={3}
                      placeholder="Write a reply…"
                      value={replyText[rev.id] || ''}
                      onChange={e => setReplyText(t => ({ ...t, [rev.id]: e.target.value }))}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button className="btn-secondary text-xs py-1.5"
                        disabled={suggesting[rev.id]}
                        onClick={() => suggest(rev.id)}>
                        <Sparkles className="w-3.5 h-3.5" />
                        {suggesting[rev.id] ? 'Generating…' : 'AI Suggest'}
                      </button>
                      <button className="btn-primary text-xs py-1.5"
                        disabled={!replyText[rev.id]?.trim() || replyMut.isPending}
                        onClick={() => replyMut.mutate({ id: rev.id, reply: replyText[rev.id] })}>
                        <MessageSquare className="w-3.5 h-3.5" /> Post Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {!isLoading && !isError && !data?.reviews?.length && (
          <div className="card empty-state">
            <div className="empty-state-emoji">⭐</div>
            <div className="empty-state-title">No reviews yet</div>
            <div className="empty-state-sub">{clientId ? 'No reviews match your filters' : 'Add your first review to track client feedback'}</div>
            <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setAddModal(true)}>Add Review</button>
          </div>
        )}
      </div>

      {addModal && (
        <Modal title="Add Review" onClose={() => setAddModal(false)}>
          <AddReviewModal
            onClose={() => setAddModal(false)}
            onSaved={() => { setAddModal(false); qc.invalidateQueries(['reviews']); }}
          />
        </Modal>
      )}
    </div>
  );
}
