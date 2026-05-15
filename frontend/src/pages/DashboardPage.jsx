import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, TrendingUp, UserX, CreditCard, AlertTriangle,
  FileText, UserPlus, CheckCircle, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAuthStore } from '../store/authStore';
import StatCard from '../components/ui/StatCard';
import api from '../services/api';

/* ── helpers ── */
function fmtINR(n) {
  const v = Number(n) || 0;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

function fmtFull(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function dueLabel(next_due_date, payment_status) {
  if (payment_status === 'overdue') return { text: 'Overdue', color: 'var(--red-text)', bg: 'var(--red-light)' };
  if (!next_due_date) return { text: 'Pending', color: 'var(--text-muted)', bg: 'var(--bg-input)' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(next_due_date); due.setHours(0, 0, 0, 0);
  const diff  = Math.round((due - today) / 86_400_000);
  if (diff < 0)  return { text: `Overdue`, color: 'var(--red-text)', bg: 'var(--red-light)' };
  if (diff === 0) return { text: 'Due today', color: 'var(--red-text)', bg: 'var(--red-light)' };
  if (diff === 1) return { text: 'Due tomorrow', color: 'var(--yellow-text)', bg: 'var(--yellow-light)' };
  if (diff <= 7) return { text: `In ${diff} days`, color: 'var(--yellow-text)', bg: 'var(--yellow-light)' };
  return { text: 'Next week', color: 'var(--text-muted)', bg: 'var(--bg-input)' };
}

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

const RANGE_OPTS = [
  { label: '3M',  months: 3  },
  { label: '6M',  months: 6  },
  { label: '12M', months: 12 },
];

/* ── Custom Tooltip ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmtFull(payload[0].value)}</div>
    </div>
  );
}

/* ── Revenue Chart ── */
function RevenueChart({ monthlyRevenue }) {
  const [range, setRange] = useState('12M');
  const months = RANGE_OPTS.find(o => o.label === range)?.months ?? 12;
  const data    = (monthlyRevenue ?? []).slice(-months).map(d => ({ ...d, name: monthLabel(d.month) }));

  if (!monthlyRevenue || monthlyRevenue.length === 0) {
    return (
      <div className="card empty-state" style={{ padding: '40px 22px' }}>
        <div className="empty-state-emoji">📊</div>
        <div className="empty-state-title">No revenue data yet</div>
        <div className="empty-state-sub">Revenue will appear here once payments are recorded</div>
      </div>
    );
  }
  const total   = data.reduce((s, d) => s + d.revenue, 0);
  const current = new Date().toISOString().slice(0, 7);
  const thisMonth = (monthlyRevenue ?? []).find(d => d.month === current)?.revenue ?? 0;
  const prevMonth = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    const ym = d.toISOString().slice(0, 7);
    return (monthlyRevenue ?? []).find(r => r.month === ym)?.revenue ?? 0;
  })();
  const pct = prevMonth > 0 ? (((thisMonth - prevMonth) / prevMonth) * 100).toFixed(1) : null;
  const curMonth = new Date().toLocaleDateString('en-IN', { month: 'long' });
  const prevMonthName = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString('en-IN', { month: 'long' });

  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Revenue Overview</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Monthly billed revenue across all clients</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGE_OPTS.map(o => (
            <button
              key={o.label}
              onClick={() => setRange(o.label)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: range === o.label ? 'var(--text-primary)' : 'transparent',
                color: range === o.label ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 28, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>YTD Revenue</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{fmtINR(total)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>This Month</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent-text)', lineHeight: 1 }}>{fmtINR(thisMonth)}</div>
        </div>
        {pct !== null && (
          <div style={{ alignSelf: 'flex-end', paddingBottom: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>VS {prevMonthName}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: Number(pct) >= 0 ? 'var(--green-text)' : 'var(--red-text)' }}>
              {Number(pct) >= 0 ? '↑' : '↓'} {Math.abs(pct)}%
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#9CA3AF', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Past months</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{curMonth} (current)</span>
        </div>
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barCategoryGap="30%" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(108,62,244,0.06)' }} />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.month}
                fill={entry.month === current ? 'var(--accent)' : '#9CA3AF'}
                opacity={entry.month === current ? 1 : 0.55}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Upcoming Payments ── */
function UpcomingPayments({ payments, isLoading }) {
  const queryClient = useQueryClient();
  const [marking, setMarking] = useState({});

  async function markPaid(clientId) {
    setMarking(p => ({ ...p, [clientId]: true }));
    try {
      await api.put(`/billing/${clientId}`, { payment_status: 'paid' });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } finally {
      setMarking(p => ({ ...p, [clientId]: false }));
    }
  }

  const total = payments?.reduce((s, p) => s + (Number(p.monthly_amount) || 0), 0) ?? 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Upcoming Payments</div>
          {!isLoading && payments?.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {payments.length} invoice{payments.length > 1 ? 's' : ''} · {fmtFull(total)} total
            </div>
          )}
        </div>
        <Link to="/billing" style={{ fontSize: 12, color: 'var(--accent-text)', textDecoration: 'none' }}>All invoices</Link>
      </div>

      <div style={{ flex: 1 }}>
        {isLoading
          ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ margin: '10px 18px', height: 52, borderRadius: 8 }} />)
          : !payments?.length
            ? <div style={{ padding: '40px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No upcoming payments</div>
            : payments.map(p => {
                const dl = dueLabel(p.next_due_date, p.payment_status);
                return (
                  <div key={p.client_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.business_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{p.city}</div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 11, fontWeight: 600, background: dl.bg, color: dl.color, borderRadius: 20, padding: '2px 8px' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: dl.color, display: 'inline-block' }} />
                        {dl.text}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
                        {p.monthly_amount ? fmtFull(p.monthly_amount) : '—'}
                      </div>
                      <button
                        onClick={() => markPaid(p.client_id)}
                        disabled={marking[p.client_id]}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: marking[p.client_id] ? 0.5 : 1 }}
                      >
                        {marking[p.client_id] ? 'Saving…' : 'Mark Paid'}
                      </button>
                    </div>
                  </div>
                );
              })
        }
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    staleTime: 60_000,
  });

  const s = data ?? {};
  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const curMonthName = new Date().toLocaleDateString('en-IN', { month: 'long' });
  const kpis = [
    { label: 'Total Clients',         value: s.total_clients           ?? '—', icon: Users,        sub: `${s.active_clients ?? 0} active`,    subColor: 'var(--green-text)' },
    { label: 'Active Clients',        value: s.active_clients          ?? '—', icon: Activity,     sub: `${s.inactive_clients ?? 0} inactive`, subColor: 'var(--text-muted)' },
    { label: 'Monthly Revenue',       value: s.total_payment_this_month != null ? fmtINR(s.total_payment_this_month) : '—', icon: TrendingUp, sub: 'received this month', subColor: 'var(--green-text)' },
    { label: 'Pending Payments',      value: s.overdue_count != null ? `${s.overdue_count}` : '—', icon: CreditCard, sub: s.overdue_count > 0 ? `${s.overdue_count} clients overdue` : 'All clear', subColor: s.overdue_count > 0 ? 'var(--red-text)' : 'var(--green-text)' },
    { label: 'Posts This Month',      value: s.posts_this_month        ?? '—', icon: FileText,     sub: 'created & scheduled' },
    { label: 'Pending Replies',       value: s.pending_replies         ?? '—', icon: CheckCircle,  sub: 'reviews unanswered',  subColor: s.pending_replies > 0 ? 'var(--red-text)' : 'var(--green-text)' },
    { label: 'New Clients',           value: s.new_clients_this_month  ?? '—', icon: UserPlus,     sub: curMonthName, subColor: 'var(--accent-text)' },
    { label: 'Monthly MRR',           value: s.total_mrr != null ? fmtINR(s.total_mrr) : '—', icon: AlertTriangle, sub: 'recurring revenue', subColor: 'var(--green-text)' },
  ];

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Welcome back, {firstName}.{' '}
          <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontStyle: 'italic' }}>Here's today.</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{today} · Ampwake Group: LocalIQ</div>
      </div>

      {/* KPI grid — 2 col mobile, 4 col tablet, 8 col on wide */}
      {isLoading ? (
        <div className="rg-kpi" style={{ marginBottom: 24 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton card" style={{ height: 110 }} />)}
        </div>
      ) : (
        <div className="rg-kpi" style={{ marginBottom: 24 }}>
          {kpis.map(k => (
            <StatCard key={k.label} label={k.label} value={k.value} sub={k.sub} subColor={k.subColor} dotColor={k.dotColor} />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="card error-state" style={{ marginBottom: 24 }}>
          <div className="error-state-emoji">⚠️</div>
          <div className="error-state-title">Failed to load dashboard</div>
          <div className="error-state-sub">Check your connection and try again</div>
          <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Revenue + Upcoming Payments — 60/40 on laptop, stacked below */}
      {!isError && (
        <div className="rg-rev">
          {isLoading
            ? <div className="skeleton card" style={{ height: 320 }} />
            : <RevenueChart monthlyRevenue={s.monthly_revenue} />
          }
          <UpcomingPayments payments={s.upcoming_payments} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
