export default function StatsCard({ icon, label, value, subValue, change, changeType, colorClass = 'blue' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">
          {value}
          {subValue && <small> {subValue}</small>}
        </div>
      </div>
      {change && (
        <span className={`stat-change ${changeType}`}>{change}</span>
      )}
    </div>
  )
}
