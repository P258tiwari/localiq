import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronRight, Plus, Filter, Building2, Download } from 'lucide-react';
import api from '../services/api';
import { downloadCSV } from '../utils/exportCSV';
import ClientAvatar from '../components/ui/ClientAvatar';


const FILTERS = ['All', 'Active', 'Inactive'];


function StatusBadge({ status }) {
  const map = {
    active:   { bg: 'var(--green-light)', color: 'var(--green-text)' },
    inactive: { bg: '#1A1A1A',            color: 'var(--text-muted)' },
  };
  const s = map[status] || map.inactive;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

function Initials({ name }) {
  const parts = name.trim().split(' ');
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: 'var(--accent-light)', border: '1px solid rgba(108,62,244,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 500,
      color: 'var(--accent-text)', textTransform: 'uppercase',
    }}>
      {letters.toUpperCase()}
    </div>
  );
}

/* Mobile card for a single client */
function ClientCard({ c }) {
  return (
    <Link
      to={`/clients/${c.id}`}
      style={{
        display: 'block', textDecoration: 'none',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '14px 16px',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <ClientAvatar client={c} size={36} radius={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.business_name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {[c.category, c.city].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={c.status} />
          {c.plan_name && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-text)', background: 'var(--accent-light)', padding: '2px 7px', borderRadius: 4 }}>{c.plan_name}</span>}
        </div>
      </div>
      {c.pending_replies > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--red-text)', background: 'var(--red-light)', borderRadius: 6, padding: '4px 10px', display: 'inline-block' }}>
          {c.pending_replies} review{c.pending_replies > 1 ? 's' : ''} pending reply
        </div>
      )}
    </Link>
  );
}

export default function ClientsPage() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage]     = useState(1);
  const perPage = 8;

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['clients', search, filter],
    queryFn: () => api.get('/clients', { params: { search: search || undefined, status: filter === 'All' ? undefined : filter.toLowerCase(), limit: 100 } }).then(r => r.data),
    retry: 0,
  });

  const raw = apiData?.clients ?? [];

  const filtered = raw.filter(c => {
    const matchFilter = filter === 'All' || c.status?.toLowerCase() === filter.toLowerCase();
    const matchSearch = !search || c.business_name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'score') return (b.score ?? 0) - (a.score ?? 0);
    if (sortBy === 'rating') return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
    return (a.business_name ?? '').localeCompare(b.business_name ?? '');
  });

  const pages = Math.ceil(sorted.length / perPage);
  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  const counts = {
    All:      raw.length,
    Active:   raw.filter(c => c.status === 'active').length,
    Inactive: raw.filter(c => c.status === 'inactive').length,
  };

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* Filter tabs — scrollable on mobile */}
      <div className="tab-bar-scroll" style={{ marginBottom: 16, gap: 4, paddingBottom: 0, borderBottom: 'none' }}>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`chip ${filter === f ? 'chip-active' : ''}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {f}
              <span style={{
                fontFamily: 'DM Mono, monospace', fontSize: 11,
                background: filter === f ? 'rgba(108,62,244,0.2)' : 'var(--border)',
                color: filter === f ? 'var(--accent-text)' : 'var(--text-muted)',
                borderRadius: 20, padding: '1px 6px', marginLeft: 2,
              }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => downloadCSV(
            `clients-${new Date().toISOString().slice(0,10)}.csv`,
            [
              { key: 'business_name', label: 'Business Name' },
              { key: 'city',          label: 'City'          },
              { key: 'category',      label: 'Category'      },
              { key: 'status',        label: 'Status'        },
              { key: 'avg_rating',    label: 'Rating'        },
              { key: 'review_count',  label: 'Reviews'       },
              { key: 'score',         label: 'Score'         },
              { key: 'plan',          label: 'Plan'          },
            ],
            sorted,
          )}
          className="btn-ghost"
          style={{ height: 34, fontSize: 13, gap: 6, flexShrink: 0, marginLeft: 4 }}
        >
          <Download size={13} /> <span className="tablet-up">Export</span>
        </button>
        <Link to="/clients/new" className="btn-primary" style={{ height: 34, fontSize: 13, gap: 6, flexShrink: 0, marginLeft: 4 }}>
          <Plus size={14} /> <span className="tablet-up">Add Client</span>
        </Link>
      </div>

      {/* Search + sort */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 0 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Search by name, city…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 34, height: 34, fontSize: 13 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Filter size={13} style={{ color: 'var(--text-muted)' }} />
          <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: 34, fontSize: 13, width: 130 }}>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="card tbl-desktop">
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 90px 36px', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <div /><div>Business</div><div>Status</div><div>Plan</div><div />
        </div>

        {isLoading
          ? [...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ margin: '8px 20px', height: 52, borderRadius: 8 }} />
            ))
          : paged.length === 0
            ? (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                  <Building2 size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No clients found</div>
                </div>
              )
            : paged.map(c => (
                <Link
                  key={c.id}
                  to={`/clients/${c.id}`}
                  style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 90px 36px', alignItems: 'center', gap: 12, padding: '12px 20px', textDecoration: 'none', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ClientAvatar client={c} size={36} radius={8} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.business_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[c.category, c.city].filter(Boolean).join(' · ')}
                      {c.pending_replies > 0 && (
                        <span style={{ marginLeft: 8, background: 'var(--red-light)', color: 'var(--red-text)', fontSize: 10, fontWeight: 600, padding: '0px 5px', borderRadius: 10 }}>
                          {c.pending_replies} pending
                        </span>
                      )}
                    </div>
                  </div>
                  <div><StatusBadge status={c.status} /></div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-text)', background: 'var(--accent-light)', padding: '2px 7px', borderRadius: 4 }}>{c.plan_name || '—'}</span>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))
        }
      </div>

      {/* Mobile card list */}
      <div className="tbl-mobile" style={{ gap: 10 }}>
        {isLoading
          ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 12 }} />)
          : paged.length === 0
            ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <Building2 size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No clients found</div>
                </div>
              )
            : paged.map(c => <ClientCard key={c.id} c={c} />)
        }
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} of {sorted.length}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[...Array(pages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                style={{
                  width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)',
                  background: page === i + 1 ? 'var(--accent)' : 'var(--bg-card)',
                  color: page === i + 1 ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
