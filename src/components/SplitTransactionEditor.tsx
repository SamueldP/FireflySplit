import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Store,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Sparkles,
  ArrowRight,
  PieChart,
  Percent,
  Copy,
  Check
} from 'lucide-react';
import { ParsedReceipt, SplitItem } from '../types';
import { CATEGORY_PALETTES, DEFAULT_CATEGORY_LIST } from '../data/samples';

interface SplitTransactionEditorProps {
  receipt: ParsedReceipt;
  onChange: (updated: ParsedReceipt) => void;
  onProceedToSync: () => void;
  onViewPayload: () => void;
}

export const SplitTransactionEditor: React.FC<SplitTransactionEditorProps> = ({
  receipt,
  onChange,
  onProceedToSync,
  onViewPayload,
}) => {
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Update header field
  const handleHeaderChange = (field: keyof ParsedReceipt, value: any) => {
    const updated = { ...receipt, [field]: value };
    recalculate(updated);
  };

  // Update individual split field
  const handleSplitChange = (id: string, field: keyof SplitItem, value: any) => {
    const newSplits = receipt.splits.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    const updated = { ...receipt, splits: newSplits };
    recalculate(updated);
  };

  // Delete a split item
  const handleDeleteSplit = (id: string) => {
    const newSplits = receipt.splits.filter((s) => s.id !== id);
    const updated = { ...receipt, splits: newSplits };
    recalculate(updated);
  };

  // Add new blank split item
  const handleAddSplit = () => {
    const sum = receipt.splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    const diff = Math.max(0, Number((receipt.total_amount - sum).toFixed(2)));

    const newSplit: SplitItem = {
      id: `split-${Date.now()}`,
      description: 'New line item',
      amount: diff > 0 ? diff : 0.0,
      category: 'General Expenses',
      quantity: 1,
      unit_price: diff > 0 ? diff : 0.0,
      notes: '',
      destination_name: receipt.store_name,
      tags: ['receipt-ai'],
    };

    const updated = { ...receipt, splits: [...receipt.splits, newSplit] };
    recalculate(updated);
  };

  // Auto-balance remainder helper
  const handleAutoBalance = () => {
    const sum = receipt.splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    const diff = Number((receipt.total_amount - sum).toFixed(2));

    if (Math.abs(diff) < 0.01) return;

    if (receipt.splits.length > 0) {
      // Add or adjust on last item or add dedicated adjustment split
      const updated = {
        ...receipt,
        splits: [
          ...receipt.splits,
          {
            id: `split-${Date.now()}`,
            description: diff > 0 ? 'Remaining Balance / Discrepancy' : 'Discount / Adjustment',
            amount: diff,
            category: diff > 0 ? 'General Expenses' : 'Discounts & Savings',
            notes: 'Auto-balanced remainder from total amount',
            destination_name: receipt.store_name,
            tags: ['receipt-ai', 'auto-balance'],
          },
        ],
      };
      recalculate(updated);
    }
  };

  // Helper to recalculate sum and balance flag
  const recalculate = (data: ParsedReceipt) => {
    const sum = Number(
      data.splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0).toFixed(2)
    );
    const total = Number(Number(data.total_amount || 0).toFixed(2));
    const isBalanced = Math.abs(total - sum) < 0.05;

    onChange({
      ...data,
      splits_sum: sum,
      is_balanced: isBalanced,
    });
  };

  // Calculate Category Breakdown Percentages
  const categoryTotals: Record<string, number> = {};
  receipt.splits.forEach((s) => {
    const cat = s.category || 'General Expenses';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(s.amount) || 0);
  });

  const totalForCalc = receipt.splits_sum > 0 ? receipt.splits_sum : 1;

  const handleCopySummary = () => {
    const lines = [
      `Receipt: ${receipt.store_name} on ${receipt.date}`,
      `Total: R${receipt.total_amount.toFixed(2)} (${receipt.currency})`,
      `Splits (${receipt.splits.length}):`,
      ...receipt.splits.map(
        (s) => ` • [${s.category}] ${s.description}: R${Number(s.amount).toFixed(2)}`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Card: Receipt Header & Balance Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        {/* Header summary & balance badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">
                  Extracted Split Transaction
                </h2>
                {receipt.is_balanced ? (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Balanced
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Off by R{Math.abs(receipt.total_amount - receipt.splits_sum).toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {receipt.splits.length} categorized splits ready for Firefly III native logging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleCopySummary}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs flex items-center gap-1.5 transition border border-slate-200"
              title="Copy text summary"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onViewPayload}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 shadow-sm transition"
            >
              View JSON
            </button>
          </div>
        </div>

        {/* Store & Transaction Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Store className="w-3 h-3 text-slate-400" /> Store / Vendor
            </label>
            <input
              type="text"
              value={receipt.store_name}
              onChange={(e) => handleHeaderChange('store_name', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium shadow-sm transition"
              placeholder="e.g. Costco Wholesale"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Date
            </label>
            <input
              type="date"
              value={receipt.date}
              onChange={(e) => handleHeaderChange('date', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium shadow-sm transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-400" /> Currency &amp; Total
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={receipt.currency}
                onChange={(e) => handleHeaderChange('currency', e.target.value.toUpperCase())}
                className="w-16 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-600 font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
              />
              <input
                type="number"
                step="0.01"
                value={receipt.total_amount}
                onChange={(e) => handleHeaderChange('total_amount', parseFloat(e.target.value) || 0)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-right shadow-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" /> Payment &amp; Tax
            </label>
            <input
              type="text"
              value={receipt.payment_method || ''}
              onChange={(e) => handleHeaderChange('payment_method', e.target.value)}
              placeholder="e.g. Visa 4921"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
            />
          </div>
        </div>

        {/* Visual Category Distribution Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
            <span className="flex items-center gap-1">
              <PieChart className="w-3.5 h-3.5 text-slate-400" /> Split Category Breakdown
            </span>
            <span className="font-mono text-slate-600">
              Splits Sum: R{receipt.splits_sum.toFixed(2)} / Total: R{receipt.total_amount.toFixed(2)}
            </span>
          </div>

          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-200">
            {Object.entries(categoryTotals).map(([cat, amt]) => {
              const pct = Math.max(2, Math.round((amt / totalForCalc) * 100));
              const palette = CATEGORY_PALETTES[cat] || { bg: 'bg-slate-300', text: '', border: '' };
              const bgClass = palette.bg.replace('/15', '');
              return (
                <div
                  key={cat}
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-sm ${bgClass} transition-all duration-300`}
                  title={`${cat}: R${amt.toFixed(2)} (${pct}%)`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(categoryTotals).map(([cat, amt]) => {
              const palette = CATEGORY_PALETTES[cat] || {
                bg: 'bg-slate-100',
                text: 'text-slate-600',
                border: 'border-slate-300',
              };
              return (
                <span
                  key={cat}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${palette.bg} ${palette.text} ${palette.border} font-medium`}
                >
                  {cat}: R{amt.toFixed(2)}
                </span>
              );
            })}
          </div>
        </div>

        {/* Balance helper alert if not balanced */}
        {!receipt.is_balanced && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Total receipt amount (R{receipt.total_amount.toFixed(2)}) does not equal the sum of splits (R{receipt.splits_sum.toFixed(2)}).
              </span>
            </div>
            <button
              onClick={handleAutoBalance}
              className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-amber-700 font-medium transition shadow-sm whitespace-nowrap self-end sm:self-auto"
            >
              Auto-Balance Remainder
            </button>
          </div>
        )}
      </div>

      {/* Split Line Items List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Split Items ({receipt.splits.length})
          </h3>
          <button
            onClick={handleAddSplit}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Split Item</span>
          </button>
        </div>

        <div className="space-y-3">
          {receipt.splits.map((split, index) => {
            const palette = CATEGORY_PALETTES[split.category] || {
              bg: 'bg-slate-100',
              text: 'text-slate-700',
              border: 'border-slate-300',
            };

            return (
              <div
                key={split.id}
                className="bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-xl p-4 transition-all duration-200 space-y-3"
              >
                {/* Main Row: Index, Description, Amount, Delete */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-400 w-5 text-right shrink-0">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={split.description}
                      onChange={(e) => handleSplitChange(split.id, 'description', e.target.value)}
                      placeholder="Item description (e.g. Lego Star Wars 75300)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 shadow-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 shadow-sm">
                      <span className="text-xs font-mono text-slate-500 font-bold">R</span>
                      <input
                        type="number"
                        step="0.01"
                        value={split.amount}
                        onChange={(e) =>
                          handleSplitChange(split.id, 'amount', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 sm:w-24 bg-transparent text-right font-mono font-bold text-sm text-slate-900 focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => handleDeleteSplit(split.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Remove split item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub Row: Category Selector, Notes, Destination */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 pt-1 text-xs">
                  {/* Category Dropdown with styling */}
                  <div className="relative shrink-0">
                    <select
                      value={split.category}
                      onChange={(e) => handleSplitChange(split.id, 'category', e.target.value)}
                      className={`appearance-none cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none pr-8 ${palette.bg} ${palette.text} ${palette.border}`}
                    >
                      {DEFAULT_CATEGORY_LIST.map((cat) => (
                        <option key={cat} value={cat} className="bg-white text-slate-900">
                          {cat}
                        </option>
                      ))}
                      {!DEFAULT_CATEGORY_LIST.includes(split.category) && (
                        <option value={split.category} className="bg-white text-slate-900">
                          {split.category}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Notes / Details */}
                  <input
                    type="text"
                    value={split.notes || ''}
                    onChange={(e) => handleSplitChange(split.id, 'notes', e.target.value)}
                    placeholder="Specific item notes or barcode / SKU (optional)"
                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 shadow-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 text-center sm:text-left">
            <span className="font-semibold text-slate-900">Next Step:</span> Configure your Firefly III target account or send transaction directly!
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleAddSplit}
              className="px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-300 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Split</span>
            </button>

            <button
              id="btn-proceed-sync"
              onClick={onProceedToSync}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
            >
              <span>Sync to Firefly III</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
