import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, ShieldAlert, AlertCircle, Info, CheckCircle2, RefreshCw } from 'lucide-react'
import api from '../utils/api'

const MOCK_ALERTS = [
  { id: 1, transaction_id: 'TXN8A2F1B', alert_level: 'CRITICAL', amount: 245000, type: 'TRANSFER', alert_message: 'Fraud detected with 91.2% confidence. Account fully drained after transfer.', is_resolved: false, created_at: new Date().toISOString() },
  { id: 2, transaction_id: 'TXN99F012', alert_level: 'HIGH',     amount: 320000, type: 'CASH_OUT', alert_message: 'High-risk cash-out transaction detected at unusual hours.', is_resolved: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, transaction_id: 'TXNABC123', alert_level: 'MEDIUM',   amount: 78000,  type: 'TRANSFER', alert_message: 'Destination balance unchanged after transaction — potential fraud indicator.', is_resolved: true,  created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, transaction_id: 'TXNDEF456', alert_level: 'HIGH',     amount: 195000, type: 'CASH_OUT', alert_message: 'Large night-time cash-out from account with low balance history.', is_resolved: false, created_at: new Date(Date.now() - 10800000).toISOString() },
  { id: 5, transaction_id: 'TXNGHI789', alert_level: 'LOW',      amount: 12000,  type: 'PAYMENT',  alert_message: 'Minor anomaly: slight balance discrepancy detected.', is_resolved: true,  created_at: new Date(Date.now() - 86400000).toISOString() },
]

const LEVEL_CONFIG = {
  CRITICAL: { icon: ShieldAlert,    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/25',    label: 'CRITICAL' },
  HIGH:     { icon: AlertTriangle,  color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25', label: 'HIGH' },
  MEDIUM:   { icon: AlertCircle,    color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/25', label: 'MEDIUM' },
  LOW:      { icon: Info,           color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/25',   label: 'LOW' },
}

export default function Alerts() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS)
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)

  async function fetchAlerts() {
    setLoading(true)
    try {
      const { data } = await api.get('/alerts?limit=30')
      if (data?.length) setAlerts(data)
    } catch { /* use mock */ }
    setLoading(false)
  }

  useEffect(() => { fetchAlerts() }, [])

  function markResolved(id) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_resolved: true } : a))
  }

  const filtered = alerts.filter(a =>
    filter === 'ALL' ? true :
    filter === 'OPEN' ? !a.is_resolved :
    filter === 'RESOLVED' ? a.is_resolved :
    a.alert_level === filter
  )

  const openCount = alerts.filter(a => !a.is_resolved).length
  const criticalCount = alerts.filter(a => a.alert_level === 'CRITICAL' && !a.is_resolved).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Fraud Alerts
            {openCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {openCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{openCount} open · {criticalCount} critical</p>
        </div>
        <button onClick={fetchAlerts} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(LEVEL_CONFIG).map(([level, cfg]) => {
          const count = alerts.filter(a => a.alert_level === level).length
          return (
            <div key={level} className={`card border ${cfg.bg} cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => setFilter(filter === level ? 'ALL' : level)}>
              <div className="flex items-center justify-between mb-2">
                <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{level}</span>
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">alerts</p>
            </div>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[#1e293b] border border-[#334155] rounded-lg p-1 w-fit">
        {['ALL', 'OPEN', 'RESOLVED'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card flex flex-col items-center py-12 text-slate-500">
            <Bell className="w-8 h-8 mb-3 text-slate-600" />
            <p className="text-sm">No alerts found</p>
          </div>
        )}

        {filtered.map(alert => {
          const cfg = LEVEL_CONFIG[alert.alert_level] || LEVEL_CONFIG.LOW
          return (
            <div key={alert.id}
              className={`card border transition-opacity ${alert.is_resolved ? 'opacity-50' : ''} ${cfg.bg}`}>
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${cfg.bg}`}>
                  <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {alert.alert_level}
                    </span>
                    <span className="font-mono text-xs text-blue-400">{alert.transaction_id}</span>
                    {alert.type && (
                      <span className="text-xs text-slate-400 bg-[#334155] px-2 py-0.5 rounded">{alert.type}</span>
                    )}
                    {alert.amount && (
                      <span className="text-xs text-slate-300 font-medium">₹{Number(alert.amount).toLocaleString()}</span>
                    )}
                    {alert.is_resolved && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 className="w-3 h-3" /> Resolved
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-300">{alert.alert_message}</p>
                  <p className="text-xs text-slate-500 mt-1.5">{new Date(alert.created_at).toLocaleString()}</p>
                </div>

                {!alert.is_resolved && (
                  <button onClick={() => markResolved(alert.id)}
                    className="flex-shrink-0 text-xs text-slate-400 hover:text-green-400 border border-[#334155] hover:border-green-500/40 px-3 py-1.5 rounded-lg transition-all duration-200">
                    Resolve
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
