import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, CheckCircle, Target, TrendingUp, RefreshCw } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid
} from 'recharts'
import api from '../utils/api'

const MOCK_STATS = {
  total: 1284, fraudulent: 47, nonFraudulent: 1237, accuracy: 97.3,
  daily: [
    { day: 'Mon', count: 32 }, { day: 'Tue', count: 28 }, { day: 'Wed', count: 41 },
    { day: 'Thu', count: 19 }, { day: 'Fri', count: 37 }, { day: 'Sat', count: 22 }, { day: 'Sun', count: 15 }
  ],
  byType: [
    { type: 'TRANSFER', count: 340 }, { type: 'CASH_OUT', count: 290 },
    { type: 'PAYMENT', count: 280 }, { type: 'CASH_IN', count: 230 }, { type: 'DEBIT', count: 144 }
  ]
}

const MOCK_TXN = [
  { id: 'TXN8A2F1B', type: 'TRANSFER', amount: 245000, location: 'Mumbai', is_fraud: true,  fraud_probability: 91.2, created_at: new Date().toISOString() },
  { id: 'TXNC3D4E5', type: 'PAYMENT',  amount: 1500,   location: 'Delhi',  is_fraud: false, fraud_probability: 4.1,  created_at: new Date().toISOString() },
  { id: 'TXN99F012', type: 'CASH_OUT', amount: 320000, location: 'Alwar',  is_fraud: true,  fraud_probability: 87.5, created_at: new Date().toISOString() },
  { id: 'TXN44B5C6', type: 'DEBIT',    amount: 7800,   location: 'Pune',   is_fraud: false, fraud_probability: 12.3, created_at: new Date().toISOString() },
  { id: 'TXN77D8E9', type: 'TRANSFER', amount: 55000,  location: 'Jaipur', is_fraud: false, fraud_probability: 28.9, created_at: new Date().toISOString() },
]

const PIE_COLORS = ['#ef4444', '#22c55e']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#60a5fa' }}>{p.name || p.dataKey}: <span className="font-semibold">{p.value}</span></p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(MOCK_STATS)
  const [txns, setTxns] = useState(MOCK_TXN)
  const [loading, setLoading] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const [s, t] = await Promise.all([
        api.get('/dashboard'),
        api.get('/transactions?limit=5')
      ])
      if (s.data?.total) setStats(s.data)
      if (t.data?.length) setTxns(t.data)
    } catch { /* use mock */ }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const statCards = [
    { label: 'Total Analyzed', value: stats.total?.toLocaleString(), icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Fraudulent', value: stats.fraudulent, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Non-Fraudulent', value: stats.nonFraudulent?.toLocaleString(), icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    { label: 'Model Accuracy', value: `${stats.accuracy}%`, icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  ]

  const pieData = [
    { name: 'Fraudulent', value: stats.fraudulent },
    { name: 'Non-Fraudulent', value: stats.nonFraudulent },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Real-time fraud detection overview</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className={`card border ${card.bg}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Fraud Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" stroke="none" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                <span className="text-slate-400">{d.name}: <span className="text-slate-200 font-medium">{d.value}</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Transactions (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.daily} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Transactions" fill="#2563eb" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By Type */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Volume by Transaction Type</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.byType} layout="vertical" barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="type" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Count" fill="#7c3aed" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Transactions */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
          <h3 className="text-sm font-semibold text-slate-300">Recent Transactions</h3>
          <TrendingUp className="w-4 h-4 text-slate-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                {['Transaction ID', 'Type', 'Amount', 'Location', 'Time', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((txn, i) => (
                <tr key={txn.id} className={`border-b border-[#334155]/50 hover:bg-[#334155]/20 transition-colors ${i % 2 === 0 ? '' : 'bg-[#334155]/10'}`}>
                  <td className="px-5 py-3 font-mono text-xs text-blue-400">{txn.id}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-[#334155] text-slate-300">{txn.type}</span>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-200">₹{Number(txn.amount).toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-400">{txn.location || '—'}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{new Date(txn.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    {txn.is_fraud || txn.isFraud
                      ? <span className="badge-fraud">FRAUD</span>
                      : <span className="badge-safe">SAFE</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
