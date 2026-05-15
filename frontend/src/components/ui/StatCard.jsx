export default function StatCard({ label, value, sub, subColor = 'var(--text-muted)', dotColor, icon: Icon }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        {Icon && (
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', flexShrink: 0,
          }}>
            <Icon size={14} />
          </span>
        )}
        {dotColor && !Icon && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, marginTop: 3, flexShrink: 0 }} />
        )}
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: subColor, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
          {dotColor && (
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
          )}
          {sub}
        </div>
      )}
    </div>
  );
}
