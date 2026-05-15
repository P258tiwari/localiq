import { useState } from 'react';
import { CreditCard, X, Download, CalendarDays, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import StatCard from '../components/ui/StatCard';
import { downloadCSV } from '../utils/exportCSV';
import api from '../services/api';

const PLANS_BASE = ['All Plans'];

const STATUS_META = {
  paid:     { label: 'Paid',     bg: 'var(--green-light)',  color: 'var(--green-text)'  },
  due_soon: { label: 'Due Soon', bg: 'var(--yellow-light)', color: 'var(--yellow-text)' },
  overdue:  { label: 'Overdue',  bg: 'var(--red-light)',    color: 'var(--red-text)'    },
  pending:  { label: 'Pending',  bg: 'var(--bg-input)',     color: 'var(--text-muted)'  },
};

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}


const COL = '1fr 110px 130px 110px 120px 120px';

function TH({ children, center }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left' }}>{children}</div>
  );
}

export default function BillingPage() {
  const [activeTab, setActiveTab]   = useState('paid');
  const [planFilter, setPlanFilter] = useState('All Plans');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['billing-list'],
    queryFn: () => api.get('/billing').then(r => r.data),
    staleTime: 30_000,
  });

  const billingList = data?.billing ?? [];

  const plans = [...PLANS_BASE, ...new Set(billingList.map(b => b.plan_name).filter(Boolean).sort())];

  const tabs = [
    { id: 'paid', label: 'Paid'     },
    { id: 'due',  label: 'Due Soon' },
    { id: 'late', label: 'Overdue'  },
  ];

  const statusMap = { due: 'due_soon', late: 'overdue', paid: 'paid' };
  const filtered = billingList.filter(b => {
    const statusOk = b.payment_status === statusMap[activeTab];
    const planOk   = planFilter === 'All Plans' || b.plan_name === planFilter;
    let dateOk = true;
    if (dateFrom || dateTo) {
      // Paid tab → filter by last_paid_on; Due/Overdue tabs → filter by next_due_date
      const rawDate = activeTab === 'paid' ? b.last_paid_on : b.next_due_date;
      const d = rawDate ? rawDate.slice(0, 10) : null;
      if (!d) dateOk = false;
      else {
        if (dateFrom && d < dateFrom) dateOk = false;
        if (dateTo   && d > dateTo)   dateOk = false;
      }
    }
    return statusOk && planOk && dateOk;
  });

  const paidList  = billingList.filter(b => b.payment_status === 'paid');
  const overdue   = billingList.filter(b => b.payment_status === 'overdue');
  const dueSoon   = billingList.filter(b => b.payment_status === 'due_soon');
  const totalMrr  = billingList.reduce((s, b) => s + (b.monthly_amount ?? 0), 0);
  const mrr       = paidList.reduce((s, b) => s + (b.monthly_amount ?? 0), 0);

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* Stats */}
      <div className="rg-kpi" style={{ marginBottom: 24 }}>
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="skeleton card" style={{ height: 110 }} />)
        ) : (
          <>
            <StatCard label="Monthly MRR"   value={`₹${(totalMrr / 1000).toFixed(1)}K`}  sub="all active clients"                                                                               dotColor="var(--green-text)"  subColor="var(--green-text)" />
            <StatCard label="Collected"     value={`₹${(mrr / 1000).toFixed(1)}K`}        sub={`${paidList.length} paid`}                                                                        subColor="var(--green-text)" />
            <StatCard label="Overdue"       value={overdue.length}                         sub={`₹${overdue.reduce((s, b) => s + (b.monthly_amount ?? 0), 0).toLocaleString('en-IN')} at risk`}  dotColor="var(--red-text)"    subColor="var(--red-text)" />
            <StatCard label="Due Soon"      value={dueSoon.length}                         sub={`₹${dueSoon.reduce((s, b) => s + (b.monthly_amount ?? 0), 0).toLocaleString('en-IN')} expected`} dotColor="var(--yellow-text)" subColor="var(--yellow-text)" />
          </>
        )}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        {/* Tabs */}
        <div className="tab-bar-scroll" style={{ border: 'none', gap: 4 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`chip ${activeTab === t.id ? 'chip-active' : ''}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {t.label}
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: activeTab === t.id ? 'rgba(108,62,244,0.2)' : 'var(--border)', color: activeTab === t.id ? 'var(--accent-text)' : 'var(--text-muted)', borderRadius: 20, padding: '1px 6px' }}>
                {t.id === 'due' ? dueSoon.length : t.id === 'late' ? overdue.length : paidList.length}
              </span>
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Date range — filters last_paid_on for Paid tab, next_due_date for others */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {activeTab === 'paid' ? 'Paid on' : 'Due on'}
              </span>
            </div>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ height: 36, fontSize: 12, width: 130, padding: '0 8px' }}
              title="From date"
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ height: 36, fontSize: 12, width: 130, padding: '0 8px' }}
              title="To date"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px', lineHeight: 1 }}
                title="Clear dates"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select className="input" value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={{ height: 36, fontSize: 13, width: 130, flexShrink: 0 }}>
            {plans.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="card error-state" style={{ marginBottom: 16 }}>
          <div className="error-state-emoji">⚠️</div>
          <div className="error-state-title">Failed to load billing data</div>
          <div className="error-state-sub">Check your connection and try again</div>
          <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Table — scrollable on small screens */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
          <div style={{ display: 'grid', gridTemplateColumns: COL, gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            <TH>Client</TH>
            <TH center>Plan</TH>
            <TH center>Amount</TH>
            <TH center>Status</TH>
            <TH center>Last Paid</TH>
            <TH center>Next Due</TH>
          </div>

          {isLoading ? (
            [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ margin: '10px 20px', height: 44, borderRadius: 8 }} />)
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <CreditCard size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No records found</div>
            </div>
          ) : filtered.map(b => {
            const meta = STATUS_META[b.payment_status] || STATUS_META.pending;
            return (
              <div
                key={b.client_id}
                style={{ display: 'grid', gridTemplateColumns: COL, gap: 12, padding: '13px 20px', alignItems: 'center', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{b.business_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{b.city}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-text)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 4 }}>{b.plan_name}</span>
                </div>
                <div style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{fmt(b.monthly_amount)}</div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: meta.bg, color: meta.color }}>{meta.label}</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(b.last_paid_on)}</div>
                <div style={{ textAlign: 'center', fontSize: 12, color: b.payment_status === 'overdue' ? 'var(--red-text)' : 'var(--text-secondary)' }}>{fmtDate(b.next_due_date)}</div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Footer summary */}
      <div className="card" style={{ marginTop: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Showing',        value: `${filtered.length} of ${billingList.length} clients` },
            { label: 'Filtered Total', value: fmt(filtered.reduce((s, b) => s + (b.monthly_amount ?? 0), 0)) },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: 'var(--text-primary)', marginTop: 2 }}>{item.value}</div>
            </div>
          ))}
        </div>
        <button
          className="btn-ghost"
          style={{ gap: 6, fontSize: 13 }}
          onClick={() => {
            const suffix = (dateFrom || dateTo)
              ? `_${dateFrom || 'start'}_to_${dateTo || 'end'}`
              : `_${new Date().toISOString().slice(0, 10)}`;
            downloadCSV(
              `billing${suffix}.csv`,
              [
                { key: 'business_name', label: 'Client'    },
                { key: 'city',          label: 'City'      },
                { key: 'plan_name',     label: 'Plan'      },
                { key: 'monthly_amount',label: 'Amount'    },
                { key: 'payment_status',label: 'Status'    },
                { key: 'last_paid_on',  label: 'Last Paid' },
                { key: 'next_due_date', label: 'Next Due'  },
              ],
              filtered,
            );
          }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

    </div>
  );
}
