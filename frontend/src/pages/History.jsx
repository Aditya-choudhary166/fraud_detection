import { useState, useEffect } from 'react'
import { Search, Filter, ChevronDown, RefreshCw, Download } from 'lucide-react'
import api from '../utils/api'

const MOCK = Array.from({ length: 15 }, (_, i) => ({
  id: 'TXN' + Math.random().toString(36).substring(2, 10).toUpperCase(),
  type: ['TRANSFER', 'CASH_OUT', 'PAYMENT', 'DEBIT', 'CASH_IN'][i % 5],
  amount: Math.round(Math.random() * 400000 + 1000),
  location: ['Mumbai', 'Delhi', 'Alwar', 'Jaipur', 'Pune', 'Bangalore'][i % 6],
  is_fraud: Math.random() > 0.75,
  fraud_probability: Math.random() > 0.75 ? 55 + Math.random() * 45 : Math.random() * 40,
  ml_model_used: Math.random() > 0.5 ? 'Random Forest' : 'Logistic Regression',
  created_at: new Date(Date.now() - i * 3600000 * Math.random() * 24).toISOString(),
}))

const TYPE_COLORS = {
  TRANSFER: 'bg-blue-500/15 text-blue-400',
  CASH_OUT:  'bg-orange-500/15 text-orange-400',
  CASH_IN:   'bg-green-500/15 text-green-400',
  PAYMENT:   'bg-purple-500/15 text-purple-400',
  DEBIT:     'bg-slate-500/15 text-slate-400',
}

export default function History() {
  const [txns, setTxns] = useState(MOCK)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchTxns() {
    setLoading(true)
    try {
      const { data } = await api.get(`/transactions?limit=50${filter === 'FRAUD' ? '&fraud_only=true' : ''}`)
      if (data?.length) setTxns(data)
    } catch { /* use mock */ }
    setLoading(false)
  }

  useEffect(() => { fetchTxns() }, [filter])

  const filtered = txns.filter(t => {
    const matchFilter = filter === 'ALL' || (filter === 'FRAUD' && (t.is_fraud || t.isFraud)) || (filter === 'SAFE' && !(t.is_fraud || t.isFraud))
    const matchSearch = !search || t.id?.toLowerCase().includes(search.toLowerCase()) || t.type?.toLowerCase().includes(search.toLowerCase()) || t.location?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  function exportCSV() {
    const headers = ['ID', 'Type', 'Amount', 'Location', 'Fraud', 'Probability', 'Model', 'Date']
    const rows = filtered.map(t => [
      t.id, t.type, t.amount, t.location || '',
      (t.is_fraud || t.isFraud) ? 'Yes' : 'No',
      Number(t.fraud_probability).toFixed(1) + '%',
      t.ml_model_used || '',
      new Date(t.created_at).toLocaleString()
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'fraudshield_transactions.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Transaction History</h1>
          <p className="text-sm text-slate-400 mt-0.5">{filtered.length} records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTxns} disabled={loading} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportCSV} className="btn-secondary">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search ID, type, location…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9" />
        </div>
        <div className="flex gap-1 bg-[#1e293b] border border-[#334155] rounded-lg p-1">
          {['ALL', 'FRAUD', 'SAFE'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                {['Transaction ID', 'Type', 'Amount (₹)', 'Location', 'Model', 'Probability', 'Date', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 text-sm">No transactions found</td>
                </tr>
              ) : filtered.map((txn, i) => {
                const isFraud = txn.is_fraud || txn.isFraud
                const prob = Number(txn.fraud_probability || 0)
                return (
                  <tr key={txn.id} className={`border-b border-[#334155]/40 hover:bg-[#334155]/20 transition-colors ${i % 2 === 0 ? '' : 'bg-[#334155]/10'}`}>
                    <td className="px-4 py-3 font-mono text-xs text-blue-400 whitespace-nowrap">{txn.id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[txn.type] || 'bg-slate-500/15 text-slate-400'}`}>
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap">₹{Number(txn.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-400">{txn.location || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{txn.ml_model_used || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#334155] rounded-full">
                          <div className={`h-full rounded-full ${isFraud ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, prob)}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-9 text-right">{prob.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(txn.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {isFraud
                        ? <span className="badge-fraud">FRAUD</span>
                        : <span className="badge-safe">SAFE</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="px-4 py-3 border-t border-[#334155] flex gap-6 text-xs text-slate-500">
          <span>Total: <span className="text-slate-300 font-medium">{filtered.length}</span></span>
          <span>Fraud: <span className="text-red-400 font-medium">{filtered.filter(t => t.is_fraud || t.isFraud).length}</span></span>
          <span>Safe: <span className="text-green-400 font-medium">{filtered.filter(t => !(t.is_fraud || t.isFraud)).length}</span></span>
        </div>
      </div>
    </div>
  )
}
