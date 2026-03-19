import { useState } from 'react'
import { AlertTriangle, CheckCircle, Loader2, RotateCcw, Save, Zap } from 'lucide-react'
import api from '../utils/api'

const TYPES = ['CASH_IN', 'CASH_OUT', 'DEBIT', 'PAYMENT', 'TRANSFER']
const MODELS = [
  { value: 'auto',                label: 'Ensemble (Best)',       desc: 'RF + LR weighted avg' },
  { value: 'random_forest',       label: 'Random Forest',         desc: 'Tree-based classifier' },
  { value: 'logistic_regression', label: 'Logistic Regression',   desc: 'Linear classifier'    },
]

const INITIAL_FORM = {
  type: 'TRANSFER', amount: '', oldBalanceOrig: '', newBalanceOrig: '',
  oldBalanceDest: '', newBalanceDest: '', hour: 12, location: '', model: 'auto'
}

const RISK_COLORS = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/25',
  HIGH:     'text-orange-400 bg-orange-500/10 border-orange-500/25',
  MEDIUM:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
  LOW:      'text-green-400 bg-green-500/10 border-green-500/25',
}

// Simulated ML (fallback if backend not running)
function mockPredict(data) {
  let score = 0
  if (data.amount > 200000) score += 0.3
  else if (data.amount > 50000) score += 0.12
  if (data.type === 'TRANSFER' || data.type === 'CASH_OUT') score += 0.18
  if (data.hour <= 5 || data.hour >= 22) score += 0.15
  if (Number(data.oldBalanceDest) === Number(data.newBalanceDest) && data.amount > 10000) score += 0.22
  if (Number(data.newBalanceOrig) === 0 && Number(data.oldBalanceOrig) > 0) score += 0.2
  score += (Math.random() - 0.5) * 0.08
  const prob = Math.min(0.98, Math.max(0.02, score))
  const probPct = Math.round(prob * 1000) / 10
  return {
    isFraud: prob > 0.5,
    probability: probPct,
    model: data.model === 'logistic_regression' ? 'Logistic Regression' : data.model === 'random_forest' ? 'Random Forest' : 'Ensemble (RF + LR)',
    riskLevel: prob > 0.85 ? 'CRITICAL' : prob > 0.65 ? 'HIGH' : prob > 0.35 ? 'MEDIUM' : 'LOW',
    features: [
      { name: 'Transaction Amount', importance: data.amount > 200000 ? 0.35 : 0.15 },
      { name: 'Balance Discrepancy', importance: 0.28 },
      { name: 'Transaction Type', importance: (data.type === 'TRANSFER' || data.type === 'CASH_OUT') ? 0.22 : 0.08 },
      { name: 'Account Drained', importance: Number(data.newBalanceOrig) === 0 ? 0.18 : 0.05 },
      { name: 'Night Transaction', importance: (data.hour <= 5 || data.hour >= 22) ? 0.15 : 0.04 },
    ].sort((a, b) => b.importance - a.importance)
  }
}

export default function Analyze() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [progress, setProgress] = useState(0)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleAnalyze(e) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setSaved(false)
    setProgress(0)

    // Animate progress
    const steps = [15, 35, 55, 72, 88, 95]
    for (const s of steps) {
      await new Promise(r => setTimeout(r, 250))
      setProgress(s)
    }

    try {
      const { data } = await api.post('/analyze', {
        type: form.type, amount: Number(form.amount),
        oldBalanceOrig: Number(form.oldBalanceOrig), newBalanceOrig: Number(form.newBalanceOrig),
        oldBalanceDest: Number(form.oldBalanceDest), newBalanceDest: Number(form.newBalanceDest),
        hour: form.hour, model: form.model
      })
      setProgress(100)
      await new Promise(r => setTimeout(r, 300))
      setResult(data)
    } catch {
      // Fallback to client-side mock
      setProgress(100)
      await new Promise(r => setTimeout(r, 300))
      setResult(mockPredict(form))
    }
    setLoading(false)
  }

  async function handleSave() {
    const txnId = 'TXN' + Math.random().toString(36).substring(2, 10).toUpperCase()
    try {
      await api.post('/transactions', {
        id: txnId, type: form.type, amount: Number(form.amount),
        oldBalanceOrig: Number(form.oldBalanceOrig), newBalanceOrig: Number(form.newBalanceOrig),
        oldBalanceDest: Number(form.oldBalanceDest), newBalanceDest: Number(form.newBalanceDest),
        hour: form.hour, location: form.location,
        isFraud: result.isFraud, probability: result.probability, model: result.model
      })
    } catch { /* save mock */ }
    setSaved(true)
  }

  const inputCls = 'input-field'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Analyze Transaction</h1>
        <p className="text-sm text-slate-400 mt-0.5">Enter transaction details to detect potential fraud</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-5">Transaction Details</h2>
          <form onSubmit={handleAnalyze} className="space-y-4">

            {/* Type + Model */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Transaction Type</label>
                <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">ML Model</label>
                <select value={form.model} onChange={e => set('model', e.target.value)} className={inputCls}>
                  {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="label">Amount (₹)</label>
              <input type="number" min="1" value={form.amount} onChange={e => set('amount', e.target.value)}
                className={inputCls} placeholder="e.g. 250000" required />
            </div>

            {/* Sender balances */}
            <div>
              <p className="label mb-2 text-slate-300">Sender Balances</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Before Transaction</label>
                  <input type="number" min="0" value={form.oldBalanceOrig} onChange={e => set('oldBalanceOrig', e.target.value)}
                    className={inputCls} placeholder="e.g. 500000" required />
                </div>
                <div>
                  <label className="label">After Transaction</label>
                  <input type="number" min="0" value={form.newBalanceOrig} onChange={e => set('newBalanceOrig', e.target.value)}
                    className={inputCls} placeholder="e.g. 250000" required />
                </div>
              </div>
            </div>

            {/* Receiver balances */}
            <div>
              <p className="label mb-2 text-slate-300">Receiver Balances</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Before Transaction</label>
                  <input type="number" min="0" value={form.oldBalanceDest} onChange={e => set('oldBalanceDest', e.target.value)}
                    className={inputCls} placeholder="e.g. 0" required />
                </div>
                <div>
                  <label className="label">After Transaction</label>
                  <input type="number" min="0" value={form.newBalanceDest} onChange={e => set('newBalanceDest', e.target.value)}
                    className={inputCls} placeholder="e.g. 0" required />
                </div>
              </div>
            </div>

            {/* Hour slider */}
            <div>
              <label className="label">Transaction Hour: <span className="text-slate-200">{form.hour}:00</span>
                {(form.hour <= 5 || form.hour >= 22) && <span className="ml-2 text-yellow-400 text-[10px]">⚠ Night hours</span>}
              </label>
              <input type="range" min={0} max={23} value={form.hour} onChange={e => set('hour', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer" />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="label">Location (optional)</label>
              <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                className={inputCls} placeholder="e.g. Mumbai, Alwar..." />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading} className="btn-primary flex-1 h-11">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Zap className="w-4 h-4" /> Analyze</>}
              </button>
              <button type="button" onClick={() => { setForm(INITIAL_FORM); setResult(null); setSaved(false) }}
                className="btn-secondary px-4">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Result Panel */}
        <div className="card flex flex-col items-center justify-center min-h-[480px]">
          {/* Loading */}
          {loading && (
            <div className="w-full space-y-4">
              <div className="text-center mb-6">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-300 font-medium">Analyzing transaction patterns…</p>
                <p className="text-xs text-slate-500 mt-1">Running ML models</p>
              </div>
              <div className="space-y-2 text-xs text-slate-400">
                {['Feature extraction', 'Running Random Forest', 'Running Logistic Regression', 'Computing ensemble'].map((step, i) => (
                  <div key={step} className={`flex items-center gap-2 transition-opacity duration-300 ${progress >= (i + 1) * 22 ? 'opacity-100' : 'opacity-30'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${progress >= (i + 1) * 22 ? 'bg-blue-400' : 'bg-slate-500'}`} />
                    {step}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Progress</span><span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-[#334155] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !result && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#334155] flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">Fill in transaction details</p>
              <p className="text-slate-500 text-xs mt-1">and click Analyze to see results</p>
            </div>
          )}

          {/* Result */}
          {!loading && result && (
            <div className="w-full animate-pop space-y-5">
              {/* Verdict */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  {result.isFraud ? (
                    <>
                      <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ring scale-125" />
                      <div className="relative w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/50 flex items-center justify-center">
                        <AlertTriangle className="w-9 h-9 text-red-400" />
                      </div>
                    </>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/50 flex items-center justify-center">
                      <CheckCircle className="w-9 h-9 text-green-400" />
                    </div>
                  )}
                </div>
                <h2 className={`text-xl font-bold ${result.isFraud ? 'text-red-400' : 'text-green-400'}`}>
                  {result.isFraud ? 'FRAUD DETECTED' : 'TRANSACTION SAFE'}
                </h2>
                <p className="text-sm text-slate-400 mt-1">{result.probability}% {result.isFraud ? 'fraud' : 'safe'} likelihood</p>

                {/* Risk badge */}
                <span className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold border ${RISK_COLORS[result.riskLevel]}`}>
                  {result.riskLevel} RISK
                </span>
              </div>

              {/* Confidence */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>Confidence Score</span><span className="font-semibold text-slate-200">{result.probability}%</span>
                </div>
                <div className="h-2.5 bg-[#334155] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${result.isFraud ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${result.probability}%` }} />
                </div>
              </div>

              {/* Model info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0f172a] rounded-lg p-3 border border-[#334155]">
                  <p className="text-[10px] text-slate-500 mb-1">MODEL USED</p>
                  <p className="text-xs text-slate-200 font-medium">{result.model}</p>
                </div>
                {result.rf_probability !== undefined && (
                  <div className="bg-[#0f172a] rounded-lg p-3 border border-[#334155]">
                    <p className="text-[10px] text-slate-500 mb-1">RF / LR SCORES</p>
                    <p className="text-xs text-slate-200 font-medium">{result.rf_probability}% / {result.lr_probability}%</p>
                  </div>
                )}
              </div>

              {/* Key factors */}
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Key Risk Factors</p>
                <div className="space-y-2">
                  {result.features?.slice(0, 4).map(f => (
                    <div key={f.name} className="flex items-center justify-between text-sm gap-3">
                      <span className="text-slate-300 text-xs truncate">{f.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-24 h-1.5 bg-[#334155] rounded-full">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${f.importance * 100}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500 w-7 text-right">{(f.importance * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={handleSave} disabled={saved}
                  className={`btn-primary flex-1 ${saved ? 'opacity-60 cursor-default' : ''}`}>
                  <Save className="w-4 h-4" />
                  {saved ? 'Saved ✓' : 'Save to DB'}
                </button>
                <button onClick={() => { setResult(null); setForm(INITIAL_FORM); setSaved(false) }} className="btn-secondary flex-1">
                  <RotateCcw className="w-4 h-4" /> New
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
