import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Sparkles, Image, Save } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function PostEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [genTopic, setGenTopic]     = useState('');
  const [imgPrompt, setImgPrompt]   = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: { post_type: 'update', status: 'draft' }
  });

  const { data: cData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients', { params: { limit: 100 } }).then(r => r.data)
  });

  const { data: postData } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api.get(`/posts/${id}`).then(r => r.data.post),
    enabled: !!id
  });

  useEffect(() => { if (postData) reset(postData); }, [postData]);

  const saveMut = useMutation({
    mutationFn: data => id
      ? api.put(`/posts/${id}`, data)
      : api.post('/posts', data),
    onSuccess: () => { toast.success('Post saved'); navigate('/posts'); },
    onError: e => toast.error(e.response?.data?.error || 'Save failed')
  });

  const clientId = watch('client_id');
  const imageUrl  = watch('image_url');

  const generateContent = async () => {
    if (!clientId) { toast.error('Select a client first'); return; }
    if (!genTopic) { toast.error('Enter a topic first'); return; }
    setGenLoading(true);
    try {
      const { data } = await api.post('/posts/generate/content', {
        client_id: clientId,
        post_type: watch('post_type'),
        topic: genTopic,
        tone: 'professional'
      });
      if (data.content.title)           setValue('title', data.content.title);
      if (data.content.content)         setValue('content', data.content.content);
      if (data.content.call_to_action)  setValue('call_to_action', data.content.call_to_action);
      toast.success('Content generated');
    } catch { toast.error('AI generation failed'); }
    finally { setGenLoading(false); }
  };

  const generateImage = async () => {
    if (!imgPrompt) { toast.error('Enter an image prompt'); return; }
    setImgLoading(true);
    try {
      const { data } = await api.post('/posts/generate/image', {
        prompt: imgPrompt,
        style: 'professional'
      });
      setValue('image_url', data.imageUrl);
      toast.success('Image generated');
    } catch { toast.error('Image generation failed'); }
    finally { setImgLoading(false); }
  };

  return (
    <div className="page py-6 max-w-5xl">
      <button onClick={() => navigate('/posts')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Posts
      </button>
      <h1 className="page-title mb-6">{id ? 'Edit Post' : 'New Post'}</h1>

      <form onSubmit={handleSubmit(d => saveMut.mutate(d))}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left col */}
          <div className="lg:col-span-2 space-y-4">
            {/* Core fields */}
            <div className="card p-5 space-y-4">
              <div className="field">
                <label className="label">Client *</label>
                <select className="input" {...register('client_id', { required: true })}>
                  <option value="">Select client…</option>
                  {cData?.clients?.map(c => (
                    <option key={c.id} value={c.id}>{c.business_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="label">Post Type</label>
                  <select className="input" {...register('post_type')}>
                    <option value="update">Update</option>
                    <option value="offer">Offer</option>
                    <option value="event">Event</option>
                    <option value="product">Product</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Call to Action</label>
                  <select className="input" {...register('call_to_action')}>
                    <option value="">None</option>
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="BOOK">Book</option>
                    <option value="ORDER">Order Online</option>
                    <option value="CALL">Call Now</option>
                    <option value="SIGN_UP">Sign Up</option>
                    <option value="BUY">Buy</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="label">Title</label>
                <input className="input" placeholder="Post headline…" {...register('title')} />
              </div>
              <div className="field">
                <label className="label">Content *</label>
                <textarea className="input" rows={6} placeholder="Post content…"
                  {...register('content', { required: true })} />
              </div>
              <div className="field">
                <label className="label">CTA URL</label>
                <input className="input" placeholder="https://…" {...register('cta_url')} />
              </div>
              <div className="field">
                <label className="label">Notes (internal)</label>
                <input className="input" {...register('notes')} />
              </div>
            </div>

            {/* AI content */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" /> AI Content Generator
              </h3>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Topic (e.g. monsoon discount, new service…)"
                  value={genTopic} onChange={e => setGenTopic(e.target.value)} />
                <button type="button" className="btn-primary shrink-0" onClick={generateContent} disabled={genLoading}>
                  {genLoading ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Image className="w-4 h-4 text-brand-600" /> Post Image
              </h3>
              {imageUrl && (
                <img src={imageUrl} alt="Preview" className="w-full h-44 object-cover rounded-lg mb-3" />
              )}
              <div className="field mb-2">
                <label className="label">Image URL</label>
                <input className="input" placeholder="Paste URL or generate below…" {...register('image_url')} />
              </div>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="AI image prompt…"
                  value={imgPrompt} onChange={e => setImgPrompt(e.target.value)} />
                <button type="button" className="btn-secondary shrink-0" onClick={generateImage} disabled={imgLoading}>
                  {imgLoading ? 'Generating…' : 'AI Image'}
                </button>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Publish</h3>
              <div className="field">
                <label className="label">Status</label>
                <select className="input" {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Schedule Date/Time</label>
                <input type="datetime-local" className="input" {...register('scheduled_at')} />
              </div>
            </div>

            {watch('post_type') === 'event' && (
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Event Details</h3>
                <div className="field">
                  <label className="label">Start</label>
                  <input type="datetime-local" className="input" {...register('event_start')} />
                </div>
                <div className="field">
                  <label className="label">End</label>
                  <input type="datetime-local" className="input" {...register('event_end')} />
                </div>
              </div>
            )}

            {watch('post_type') === 'offer' && (
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Offer Details</h3>
                <div className="field">
                  <label className="label">Coupon Code</label>
                  <input className="input" {...register('offer_coupon')} />
                </div>
                <div className="field">
                  <label className="label">Terms</label>
                  <textarea className="input" rows={2} {...register('offer_terms')} />
                </div>
              </div>
            )}

            <button type="submit" disabled={saveMut.isPending} className="btn-primary w-full">
              <Save className="w-4 h-4" />
              {saveMut.isPending ? 'Saving…' : 'Save Post'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
