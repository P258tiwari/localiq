import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, FileText, Pencil, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_BADGE = { draft: 'badge-gray', scheduled: 'badge-blue', published: 'badge-green', failed: 'badge-red' };
const TYPE_BADGE   = { update: 'badge-gray', offer: 'badge-yellow', event: 'badge-purple', product: 'badge-blue' };

export default function PostsPage() {
  const [sp] = useSearchParams();
  const [clientId, setClientId] = useState(sp.get('client_id') || '');
  const [status, setStatus]     = useState('');
  const [postType, setPostType] = useState('');
  const qc = useQueryClient();

  const { data: cData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients', { params: { limit: 100 } }).then(r => r.data)
  });

  const { data, isLoading } = useQuery({
    queryKey: ['posts', clientId, status, postType],
    queryFn: () => api.get('/posts', {
      params: {
        client_id: clientId || undefined,
        status:    status   || undefined,
        post_type: postType || undefined,
        limit: 50
      }
    }).then(r => r.data)
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/posts/${id}`),
    onSuccess: () => { toast.success('Post deleted'); qc.invalidateQueries(['posts']); }
  });

  return (
    <div className="page py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Posts</h1>
          <p className="page-sub">{data?.total ?? 0} total</p>
        </div>
        <Link to="/posts/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Post
        </Link>
      </div>

      <div className="card p-3.5 mb-4 flex flex-wrap gap-3">
        <select className="input w-48" value={clientId} onChange={e => setClientId(e.target.value)}>
          <option value="">All Clients</option>
          {cData?.clients?.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
        </select>
        <select className="input w-32" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
        </select>
        <select className="input w-32" value={postType} onChange={e => setPostType(e.target.value)}>
          <option value="">All Types</option>
          <option value="update">Update</option>
          <option value="offer">Offer</option>
          <option value="event">Event</option>
          <option value="product">Product</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? [...Array(6)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse space-y-3">
            <div className="h-28 bg-gray-200 rounded-lg" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded" />
          </div>
        )) : data?.posts?.map(p => (
          <div key={p.id} className="card overflow-hidden hover:shadow-md transition-shadow">
            {p.image_url && (
              <img src={p.image_url} alt="" className="w-full h-32 object-cover" />
            )}
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <span className={STATUS_BADGE[p.status] ?? 'badge-gray'}>{p.status}</span>
                <span className={TYPE_BADGE[p.post_type] ?? 'badge-gray'}>{p.post_type}</span>
              </div>
              {p.title && <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">{p.title}</h3>}
              <p className="text-xs text-gray-500 line-clamp-2">{p.content}</p>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-400 min-w-0">
                  {p.business_name && <p className="truncate">{p.business_name}</p>}
                  {p.scheduled_at && (
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(p.scheduled_at), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link to={`/posts/${p.id}/edit`}
                    className="p-1.5 text-gray-400 hover:text-brand-600 rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                    onClick={() => confirm('Delete this post?') && del.mutate(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && !data?.posts?.length && (
        <div className="card py-16 text-center">
          <FileText className="w-10 h-10 mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400 mb-4">No posts found</p>
          <Link to="/posts/new" className="btn-primary">Create your first post</Link>
        </div>
      )}
    </div>
  );
}
