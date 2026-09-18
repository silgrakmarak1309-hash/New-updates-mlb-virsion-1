import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, Search, CreditCard, ArrowUpRight } from 'lucide-react';
import { RechargeRequest, formatPrice } from '../types';

interface TransactionLogsProps {
  recharges: RechargeRequest[];
  onNewRechargeClick: () => void;
}

export const TransactionLogs: React.FC<TransactionLogsProps> = ({
  recharges,
  onNewRechargeClick,
}) => {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  const filtered = recharges.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.utr.toLowerCase().includes(q) ||
        r.plan_name.toLowerCase().includes(q) ||
        r.user_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Transaction Logs & Audit Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time record of all UPI payments, UTR verification status, and PRO subscription logs.
          </p>
        </div>

        <button
          onClick={onNewRechargeClick}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CreditCard className="w-4 h-4" />
          Make a Payment
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {(['all', 'approved', 'pending', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                filter === s
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by UTR or Plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No transaction records found</p>
          <p className="text-xs text-slate-400 mt-1">Submitted payments will show up here immediately.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Plan & Amount</th>
                <th className="p-3">12-Digit UTR Ref</th>
                <th className="p-3">User Contact</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3">
                    <div className="font-bold text-slate-900 font-sans">{req.plan_name}</div>
                    <div className="text-emerald-600 font-black text-xs">₹{formatPrice(req.amount)}</div>
                  </td>
                  <td className="p-3 text-orange-600 font-bold">{req.utr}</td>
                  <td className="p-3 font-sans">
                    <div className="font-semibold text-slate-800">{req.user_name}</div>
                    <div className="text-[11px] text-slate-400">{req.user_phone}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase font-sans ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="p-3 text-right text-[11px] text-slate-400">
                    {req.created_at
                      ? (() => {
                          const d = new Date(req.created_at);
                          return isNaN(d.getTime()) ? 'Recently' : d.toLocaleString('en-IN');
                        })()
                      : 'Just now'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
