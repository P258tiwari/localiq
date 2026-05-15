import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ClientForm({ client, onSaved, onCancel }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: client ?? { status: 'active' }
  });

  const { data: userData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data)
  });

  const mut = useMutation({
    mutationFn: data => client
      ? api.put(`/clients/${client.id}`, data)
      : api.post('/clients', data),
    onSuccess: () => { toast.success(client ? 'Client updated' : 'Client created'); onSaved(); },
    onError: e => toast.error(e.response?.data?.error || 'Save failed')
  });

  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} className="p-5 space-y-5">
      {/* Business info */}
      <fieldset>
        <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Business Info</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 field">
            <label className="label">Business Name *</label>
            <input className="input" placeholder="Sharma Dental Clinic"
              {...register('business_name', { required: 'Required' })} />
            {errors.business_name && <p className="text-xs text-red-500">{errors.business_name.message}</p>}
          </div>
          <div className="field">
            <label className="label">Category</label>
            <input className="input" placeholder="Dentist, Restaurant…" {...register('category')} />
          </div>
          <div className="field">
            <label className="label">Industry</label>
            <input className="input" placeholder="Healthcare, F&B…" {...register('industry')} />
          </div>
          <div className="field">
            <label className="label">Business Phone (GBP)</label>
            <input className="input" placeholder="+91 98765 43210" {...register('gbp_phone')} />
          </div>
          <div className="field">
            <label className="label">Website</label>
            <input className="input" placeholder="https://" {...register('website')} />
          </div>
          <div className="col-span-2 field">
            <label className="label">Google Business Profile URL</label>
            <input className="input" placeholder="Paste their Google listing URL (optional)"
              {...register('gbp_url')} />
          </div>
        </div>
      </fieldset>

      {/* Contact */}
      <fieldset>
        <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Person</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label className="label">Contact Name</label>
            <input className="input" {...register('contact_name')} />
          </div>
          <div className="field">
            <label className="label">Contact Phone</label>
            <input className="input" {...register('contact_phone')} />
          </div>
          <div className="col-span-2 field">
            <label className="label">Contact Email</label>
            <input type="email" className="input" {...register('contact_email')} />
          </div>
        </div>
      </fieldset>

      {/* Address */}
      <fieldset>
        <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Address</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 field">
            <label className="label">Street Address</label>
            <input className="input" {...register('address')} />
          </div>
          <div className="field">
            <label className="label">City</label>
            <input className="input" {...register('city')} />
          </div>
          <div className="field">
            <label className="label">State</label>
            <input className="input" {...register('state')} />
          </div>
          <div className="field">
            <label className="label">Pincode</label>
            <input className="input" {...register('pincode')} />
          </div>
        </div>
      </fieldset>

      {/* Management */}
      <fieldset>
        <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Management</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospect</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Assigned To</label>
            <select className="input" {...register('assigned_to')}>
              <option value="">Unassigned</option>
              {userData?.users?.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 field">
            <label className="label">Notes</label>
            <textarea className="input" rows={2} {...register('notes')} />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-2 pt-1">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={mut.isPending} className="btn-primary flex-1">
          {mut.isPending ? 'Saving…' : (client ? 'Update Client' : 'Create Client')}
        </button>
      </div>
    </form>
  );
}
