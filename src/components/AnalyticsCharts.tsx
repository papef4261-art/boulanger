import React, { useMemo, useState, useEffect } from 'react';
import { DailyJournal, TimePeriod, MonthlyProfitRecord } from '../types';
import { formatCurrency, formatNumber, formatDateFrench } from '../utils/calculations';
import {
  calculateMonthlyProfitRecords,
  autoSaveMonthlyProfitRecords,
  MONTH_SHORT_NAMES_FR,
} from '../utils/monthlyRecords';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
} from 'lucide-react';

interface AnalyticsChartsProps {
  journals: DailyJournal[];
  currency: string;
  selectedPeriod: TimePeriod;
  currentUserId?: string;
  onUpdateSellerInfo?: (sellerName: string, updatedInfo: { phone?: string; age?: number | string; role?: string }) => void;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  journals,
  currency,
  selectedPeriod,
  currentUserId,
}) => {
  // Chart granularity: 'daily' (Tous les Jours) vs 'monthly' (Tous les 1 mois)
  // Defaults to daily view to show day-by-day profits as requested
  const [chartViewMode, setChartViewMode] = useState<'daily' | 'monthly'>('daily');
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlyProfitRecord[]>([]);

  // Automatically consolidate and save monthly records in background whenever journals change
  useEffect(() => {
    autoSaveMonthlyProfitRecords(journals, currentUserId).then((records) => {
      setMonthlyRecords(records);
    });
  }, [journals, currentUserId]);

  // Daily sorted data
  const dailyChartData = useMemo(() => {
    const sorted = [...journals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Filter based on period
    const now = new Date();
    let sliceDays = 30;
    if (selectedPeriod === 'today') sliceDays = 7;
    else if (selectedPeriod === '7days') sliceDays = 7;
    else if (selectedPeriod === 'month') sliceDays = 30;
    else if (selectedPeriod === 'year') sliceDays = 365;
    else sliceDays = 9999;

    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - sliceDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filtered = sorted.filter((j) => j.date >= cutoffStr);
    const items = filtered.length > 0 ? filtered : sorted.slice(-sliceDays);

    return items.map((j) => {
      let shortDate = j.date;
      if (j.date && j.date.includes('-')) {
        const parts = j.date.split('-');
        if (parts.length === 3) {
          shortDate = `${parts[2]}/${parts[1]}`;
        }
      }
      const returnAmt = j.summary?.returnPriceTotal || ((j.summary?.totalReturned || 0) * (j.unitReturnPrice || 0));
      return {
        date: j.date,
        label: shortDate,
        fullLabel: formatDateFrench(j.date),
        gain: j.summary?.netGain ?? 0,
        revenue: j.summary?.grossRevenue ?? 0,
        returnAmount: returnAmt,
        soldUnits: j.summary?.totalSold ?? 0,
        returnUnits: j.summary?.totalReturned ?? 0,
        lostUnits: j.summary?.totalLost ?? 0,
        lossAmount: j.summary?.lossAmount ?? j.summary?.returnLossAmount ?? 0,
        expenses: j.summary?.totalExpenses ?? 0,
        isMonthRecord: false,
      };
    });
  }, [journals, selectedPeriod]);

  // Monthly aggregated chart data (tous les 1 mois)
  const monthlyChartData = useMemo(() => {
    const records = monthlyRecords.length > 0 ? monthlyRecords : calculateMonthlyProfitRecords(journals);
    return records.map((rec) => {
      const shortMonth = `${MONTH_SHORT_NAMES_FR[rec.monthIndex]} ${rec.year}`;
      const returnAmt = rec.totalReturnAmount ?? ((rec.totalReturnUnits || 0) * 50);
      return {
        date: rec.monthKey,
        label: shortMonth,
        fullLabel: rec.monthLabel,
        gain: rec.totalNetGain,
        revenue: rec.totalGrossRevenue,
        returnAmount: returnAmt,
        soldUnits: rec.totalSoldUnits,
        returnUnits: rec.totalReturnUnits,
        lostUnits: rec.totalLostUnits,
        expenses: rec.totalExpenses,
        daysCount: rec.daysCount,
        averageDailyGain: rec.averageDailyGain,
        status: rec.status,
        lastAutoSaved: rec.lastAutoSaved,
        isMonthRecord: true,
      };
    });
  }, [monthlyRecords, journals]);

  const activeChartData = chartViewMode === 'monthly' ? monthlyChartData : dailyChartData;

  return (
    <div className="space-y-6" id="analytics-section">
      
      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gain & Chiffre d'affaires over time */}
        <div className="bg-[#FAFAF7] rounded-2xl border border-[#DCD6CB] p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A] font-editorial text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#2D5A43]" />
                <span>Graphiques des Gains (Tous les Jours)</span>
              </h3>
              <p className="text-xs text-[#7A756D] font-editorial italic">
                {chartViewMode === 'daily'
                  ? `Évolution continue des bénéfices journaliers, du chiffre d’affaires et des retours en ${currency}`
                  : `Consolidation automatique enregistrée tous les 1 mois en ${currency}`}
              </p>
            </div>

            {/* TOGGLE TOUS LES JOURS VS TOUS LES 1 MOIS */}
            <div className="inline-flex bg-[#EBE8E0] p-1 rounded-xl border border-[#DCD6CB] text-xs font-semibold">
              <button
                id="btn-view-mode-daily"
                onClick={() => setChartViewMode('daily')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartViewMode === 'daily'
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'text-[#5C574F] hover:text-[#1A1A1A]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Tous les Jours</span>
              </button>
              <button
                id="btn-view-mode-monthly"
                onClick={() => setChartViewMode('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartViewMode === 'monthly'
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'text-[#5C574F] hover:text-[#1A1A1A]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tous les 1 mois</span>
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gainGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D5A43" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2D5A43" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7A756D" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7A756D" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B45309" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#B45309" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBE8E0" />
                <XAxis dataKey="label" stroke="#8C877E" fontSize={11} tickLine={false} />
                <YAxis stroke="#8C877E" fontSize={11} tickLine={false} tickFormatter={(val) => `${Math.round(val / 1000)}k`} />
                <Tooltip
                  formatter={(val: any, name: string, item: any) => {
                    const num = Number(val) || 0;
                    if (name === 'gain') {
                      return [
                        formatCurrency(num, currency),
                        chartViewMode === 'monthly' ? 'Bénéfice Net Mensuel' : 'Bénéfice Net Journalier'
                      ];
                    }
                    if (name === 'revenue') {
                      return [
                        formatCurrency(num, currency),
                        chartViewMode === 'monthly' ? 'Chiffre d’affaires Mensuel' : 'Chiffre d’affaires Journalier'
                      ];
                    }
                    if (name === 'returnAmount') {
                      const units = item?.payload?.returnUnits ?? 0;
                      return [
                        `${formatCurrency(num, currency)} (${units} retour${units > 1 ? 's' : ''})`,
                        chartViewMode === 'monthly' ? 'Retours Mensuels' : 'Retours Journaliers'
                      ];
                    }
                    return [formatCurrency(num, currency), name];
                  }}
                  labelFormatter={(_lbl, payload) => {
                    if (payload && payload[0]) {
                      const p = payload[0].payload;
                      if (p.isMonthRecord) {
                        return `${p.fullLabel} (${p.daysCount || 0} jours de vente enregistrés)`;
                      }
                      return p.fullLabel || p.date;
                    }
                    return _lbl;
                  }}
                  contentStyle={{ backgroundColor: '#1F1E1C', borderColor: '#383530', borderRadius: '12px', color: '#F4F1EA', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#7A756D" strokeWidth={2} fillOpacity={1} fill="url(#revGradient)" name="revenue" />
                <Area type="monotone" dataKey="gain" stroke="#2D5A43" strokeWidth={3} fillOpacity={1} fill="url(#gainGradient)" name="gain" />
                <Area type="monotone" dataKey="returnAmount" stroke="#B45309" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#returnGradient)" name="returnAmount" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-[#7A756D] border-t border-[#EBE8E0] pt-2 font-editorial gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2D5A43]"></span>
              <span>Ligne verte : Bénéfice net ({chartViewMode === 'monthly' ? 'cumul par mois' : 'tous les jours'})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7A756D]"></span>
              <span>Ligne grise : Chiffre d’affaires</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-[#92400E]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]"></span>
              <span>Ligne ambrée : Retours ({chartViewMode === 'monthly' ? 'mois' : 'tous les jours'})</span>
            </span>
          </div>
        </div>

        {/* Quantités vendues vs Retours vs Pertes */}
        <div className="bg-[#FAFAF7] rounded-2xl border border-[#DCD6CB] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A] font-editorial text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#5C574F]" />
                <span>Flux des Articles (Ventes / Retours / Pertes)</span>
              </h3>
              <p className="text-xs text-[#7A756D] font-editorial italic">
                {chartViewMode === 'monthly'
                  ? 'Quantités totales enregistrées tous les 1 mois'
                  : 'Quantités enregistrées tous les jours'}
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBE8E0" />
                <XAxis dataKey="label" stroke="#8C877E" fontSize={11} tickLine={false} />
                <YAxis stroke="#8C877E" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    `${formatNumber(Number(val))} unités`,
                    name === 'soldUnits' ? 'Vendus' : name === 'returnUnits' ? 'Retours' : 'Pertes',
                  ]}
                  labelFormatter={(_lbl, payload) => {
                    if (payload && payload[0]) {
                      const p = payload[0].payload;
                      return p.fullLabel || p.date;
                    }
                    return _lbl;
                  }}
                  contentStyle={{ backgroundColor: '#1F1E1C', borderColor: '#383530', borderRadius: '12px', color: '#F4F1EA', fontSize: '12px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  formatter={(val) => (val === 'soldUnits' ? 'Vendus' : val === 'returnUnits' ? 'Retours' : 'Pertes')}
                />
                <Bar dataKey="soldUnits" fill="#2D5A43" radius={[4, 4, 0, 0]} name="soldUnits" />
                <Bar dataKey="returnUnits" fill="#9C6B28" radius={[4, 4, 0, 0]} name="returnUnits" />
                <Bar dataKey="lostUnits" fill="#8B3A3A" radius={[4, 4, 0, 0]} name="lostUnits" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[#7A756D] border-t border-[#EBE8E0] pt-2 font-editorial">
            <span>Évolution des volumes enregistrés ({chartViewMode === 'monthly' ? 'tous les 1 mois' : 'par jour'})</span>
          </div>
        </div>

      </div>

    </div>
  );
};
