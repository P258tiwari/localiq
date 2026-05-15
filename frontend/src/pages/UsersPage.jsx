import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, UserX, UserCheck } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/Modal';
import clsx from 'clsx';

function AddUserForm({ onClose, onSaved }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { role: 'staff' } });

  const mut = useMutation({
    mutationFn: data => api.post('/users', data),
    onSuccess: () => { toast.success('User created'); onSaved(); },
    onError:   e  => toast.error(e.response?.data?.error || 'Failed')
  });

  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} className="p-5 space-y-4">
      <div className="field">
        <label className="label">Full Name *</label>
        <input className="input" {...register('name', { required: true })} />
      </div>
      <div className="field">
        <label className="label">Email *</label>
        <input type="email" className="input" {...register('email', { required: true })} />
      </div>
      <div className="field">
        <label className="label">Password *</label>
        <input type="password" className="input" placeholder="Min 8 characters"
          {...register('password', { required: true, minLength: 8 })} />
        {errors.password && <p className="text-xs text-red-500">Min 8 characters</p>}
      </div>
      <div className="field">
        <label className="label">Role</label>
        <select className="input" {...register('role')}>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button type="submit" disabled={mut.isPending} className="btn-primary flex-1">
          {mut.isPending ? 'Creating…' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

const ROLE_BADGE = { admin: 'badge-red', manager: 'badge-blue', staff: 'badge-gray' };

export default function UsersPage() {
  const [showAdd, setShowAdd] = useState(false);
  const { user: me } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data)
  });

  const toggle = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/users/${id}`, { is_active }),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries(['users']); }
  });

  return (
    <div className="page py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-sub">{data?.users?.length ?? 0} members</p>
        </div>
        {me?.role === 'admin' && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Member
          </button>
        )}
      </div>

      <div className="card tbl-divider">
        {isLoading ? [...Array(3)].map((_, i) => (
          <div key={i} className="tbl-row animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
          </div>
        )) : data?.users?.map(u => (
          <div key={u.id} className="tbl-row">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-sm font-semibold text-brand-700 shrink-0">
              {u.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{u.name}</span>
                <span className={ROLE_BADGE[u.role] ?? 'badge-gray'}>{u.role}</span>
                {!u.is_active && <span className="badge-red">Inactive</span>}
              </div>
              <p className="text-xs text-gray-400">{u.email}</p>
            </div>
            {me?.role === 'admin' && u.id !== me.id && (
              <button
                className={clsx('p-1.5 rounded transition-colors',
                  u.is_active ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-600')}
                onClick={() => toggle.mutate({ id: u.id, is_active: !u.is_active })}
                title={u.is_active ? 'Deactivate' : 'Activate'}>
                {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </button>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Add Team Member" onClose={() => setShowAdd(false)}>
          <AddUserForm
            onClose={() => setShowAdd(false)}
            onSaved={() => { setShowAdd(false); qc.invalidateQueries(['users']); }}
          />
        </Modal>
      )}
    </div>
  );
}
