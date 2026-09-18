import React, { useState, useMemo } from 'react';
import { DailyJournal, TimePeriod } from '../types';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { getLocalDateString, useLiveDateTime } from '../utils/dateTime';
import { 
  TrendingUp, 
  CalendarDays, 
  CalendarRange, 
  Sparkles, 
  ArrowUpRight,
  PackageCheck,
  RotateCcw,
  AlertTriangle,
  Award,
  Clock,
  ChevronDown,
  Calendar,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface ProfitMetricCardsProps {
  journals: DailyJournal[];
  currency: string;
  selectedPeriod: TimePeriod;
  onSelectPeriod: (period: TimePeriod) => void;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const ProfitMetricCards: React.FC<ProfitMetricCardsProps> = ({
  journals,
  currency,
  selectedPeriod,
  onSelectPeriod,
}) => {
  const { todayStr, timeStr, formattedDateLong } = useLiveDateTime();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-11
  const currentMonthKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

  // Interactive selectors state
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [selectedYearKey, setSelectedYearKey] = useState<string>(String(currentYear));
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState<boolean>(false);
  const [breakdownTab, setBreakdownTab] = useState<'months' | 'years'>('months');
  const [breakdownYear, setBreakdownYear] = useState<number>(currentYear);

  // Group all journals by Month (YYYY-MM)
  const monthlyDataMap = useMemo(() => {
    const map: Record<string, {
      key: string;
      year: number;
      monthIdx: number;
      monthName: string;
      totalGain: number;
      totalRevenue: number;
      totalSold: number;
      totalReturned: number;
      totalLost: number;
      daysCount: number;
      journals: DailyJournal[];
    }> = {};

    journals.forEach((j) => {
      if (!j.date) return;
      const parts = j.date.split('-');
      if (parts.length < 2) return;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;

      if (!map[key]) {
        map[key] = {
          key,
          year: y,
          monthIdx: m,
          monthName: MONTH_NAMES_FR[m] || `Mois ${m + 1}`,
          totalGain: 0,
          totalRevenue: 0,
          totalSold: 0,
          totalReturned: 0,
          totalLost: 0,
          daysCount: 0,
          journals: [],
        };
      }

      map[key].totalGain += (j.summary?.netGain || 0);
      map[key].totalRevenue += (j.summary?.grossRevenue || 0);
      map[key].totalSold += (j.summary?.totalSold || 0);
      map[key].totalReturned += (j.summary?.totalReturned || 0);
      map[key].totalLost += (j.summary?.totalLost || 0);
      map[key].daysCount += 1;
      map[key].journals.push(j);
    });

    return map;
  }, [journals]);

  // Group all journals by Year (YYYY)
  const yearlyDataMap = useMemo(() => {
    const map: Record<string, {
      year: number;
      totalGain: number;
      totalRevenue: number;
      totalSold: number;
      daysCount: number;
      monthsActiveCount: number;
    }> = {};

    journals.forEach((j) => {
      if (!j.date) return;
      const y = parseInt(j.date.split('-')[0], 10);
      const key = String(y);

      if (!map[key]) {
        map[key] = {
          year: y,
          totalGain: 0,
          totalRevenue: 0,
          totalSold: 0,
          daysCount: 0,
          monthsActiveCount: 0,
        };
      }

      map[key].totalGain += (j.summary?.netGain || 0);
      map[key].totalRevenue += (j.summary?.grossRevenue || 0);
      map[key].totalSold += (j.summary?.totalSold || 0);
      map[key].daysCount += 1;
    });

    // Count distinct months for each year
    Object.keys(map).forEach((yearStr) => {
      const distinctMonths = new Set(
        journals
          .filter((j) => j.date && j.date.startsWith(yearStr))
          .map((j) => j.date.substring(0, 7))
      );
      map[yearStr].monthsActiveCount = distinctMonths.size;
    });

    return map;
  }, [journals]);

  // List of distinct years in journals + current year + previous year (e.g. 2025)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentYear, currentYear - 1]);
    journals.forEach((j) => {
      if (j.date) {
        const y = parseInt(j.date.split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [journals, currentYear]);

  // Calculate today
  const todayJournals = journals.filter((j) => j.date === todayStr);
  const hasTodayData = todayJournals.length > 0;
  const todayData = hasTodayData ? todayJournals[0] : (journals.length > 0 ? journals[0] : null);
  const todayGain = todayData ? todayData.summary.netGain : 0;
  const todaySold = todayData ? todayData.summary.totalSold : 0;

  // Function to aggregate journals in past N days
  const getPeriodStats = (days: number) => {
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);
    const cutoffStr = getLocalDateString(cutoff);

    const periodJournals = journals.filter((j) => j.date >= cutoffStr);
    const count = periodJournals.length;

    const totalGain = periodJournals.reduce((acc, j) => acc + (j.summary?.netGain || 0), 0);
    const totalSold = periodJournals.reduce((acc, j) => acc + (j.summary?.totalSold || 0), 0);
    const avgDailyGain = count > 0 ? totalGain / count : 0;

    return {
      daysCount: count,
      totalGain,
      totalSold,
      avgDailyGain,
    };
  };

  const stats7Days = getPeriodStats(7);
  const stats30Days = getPeriodStats(30);
  const stats365Days = getPeriodStats(365);

  // Total de tous les jours enregistrés
  const statsAllDays = useMemo(() => {
    const count = journals.length;
    const totalGain = journals.reduce((acc, j) => acc + (j.summary?.netGain || 0), 0);
    const totalSold = journals.reduce((acc, j) => acc + (j.summary?.totalSold || 0), 0);
    const avgDailyGain = count > 0 ? totalGain / count : 0;
    return {
      daysCount: count,
      totalGain,
      totalSold,
      avgDailyGain,
    };
  }, [journals]);

  // Month stats for selected month key
  const selectedMonthData = useMemo(() => {
    if (selectedMonthKey === 'rolling-30') {
      return {
        title: '30 Derniers Jours',
        gain: stats30Days.totalGain,
        soldUnits: stats30Days.totalSold,
        daysCount: stats30Days.daysCount,
        avgGain: stats30Days.avgDailyGain,
        isCustomMonth: false,
      };
    }

    const data = monthlyDataMap[selectedMonthKey];
    const [y, m] = selectedMonthKey.split('-');
    const monthName = MONTH_NAMES_FR[parseInt(m, 10) - 1] || `Mois ${m}`;

    if (data) {
      return {
        title: `${monthName} ${y}`,
        gain: data.totalGain,
        soldUnits: data.totalSold,
        daysCount: data.daysCount,
        avgGain: data.daysCount > 0 ? data.totalGain / data.daysCount : 0,
        isCustomMonth: true,
      };
    }

    return {
      title: `${monthName} ${y}`,
      gain: 0,
      soldUnits: 0,
      daysCount: 0,
      avgGain: 0,
      isCustomMonth: true,
    };
  }, [selectedMonthKey, monthlyDataMap, stats30Days]);

  // Year stats for selected year key
  const selectedYearData = useMemo(() => {
    if (selectedYearKey === 'rolling-365') {
      return {
        title: '365 Derniers Jours',
        gain: stats365Days.totalGain,
        soldUnits: stats365Days.totalSold,
        daysCount: stats365Days.daysCount,
        avgGain: stats365Days.avgDailyGain,
        isCustomYear: false,
      };
    }

    const data = yearlyDataMap[selectedYearKey];
    if (data) {
      return {
        title: `Année ${selectedYearKey}`,
        gain: data.totalGain,
        soldUnits: data.totalSold,
        daysCount: data.daysCount,
        monthsActive: data.monthsActiveCount,
        isCustomYear: true,
      };
    }

    return {
      title: `Année ${selectedYearKey}`,
      gain: 0,
      soldUnits: 0,
      daysCount: 0,
      monthsActive: 0,
      isCustomYear: true,
    };
  }, [selectedYearKey, yearlyDataMap, stats365Days]);

  // Whether a full month exists for the selected month view
  // "Si on a pas encore un mois ou une année mettez (0 CFA) ici"
  const hasFullMonth = useMemo(() => {
    if (!selectedMonthData || selectedMonthData.daysCount === 0) return false;
    if (selectedMonthKey === 'rolling-30') {
      return selectedMonthData.daysCount >= 28;
    }
    const [yStr, mStr] = selectedMonthKey.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;

    // Future month: not yet completed
    if (y > currentYear || (y === currentYear && m > currentMonthIdx)) {
      return false;
    }
    // Current ongoing month (e.g. Sept 2026 has only 3 days so far)
    if (y === currentYear && m === currentMonthIdx) {
      return selectedMonthData.daysCount >= 28;
    }
    // Past month: must have at least 25 recorded days
    return selectedMonthData.daysCount >= 25;
  }, [selectedMonthData, selectedMonthKey, currentYear, currentMonthIdx]);

  // Whether a full year exists for the selected year view
  const hasFullYear = useMemo(() => {
    if (!selectedYearData || selectedYearData.daysCount === 0) return false;
    if (selectedYearKey === 'rolling-365') {
      return selectedYearData.daysCount >= 350;
    }
    const y = parseInt(selectedYearKey, 10);
    // Future year
    if (y > currentYear) return false;
    // Current ongoing year (e.g. 2026 only has 3 days in Sept)
    if (y === currentYear) {
      return selectedYearData.daysCount >= 350 || (selectedYearData.monthsActive !== undefined && selectedYearData.monthsActive >= 12);
    }
    // Past year
    return (selectedYearData.monthsActive !== undefined && selectedYearData.monthsActive >= 11) || selectedYearData.daysCount >= 300;
  }, [selectedYearData, selectedYearKey, currentYear]);

  return (
    <section className="space-y-4" id="section-profit-summary">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold font-editorial text-[#1A1A1A] tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2D5A43]" />
              <span>Calcul des Gains & Bénéfices</span>
            </h2>
          </div>
          <p className="text-xs text-[#7A756D] font-editorial italic mt-0.5">
            Journal débuté en Septembre 2026 • Les mois et années non enregistrés affichent (0 {currency}) • {formattedDateLong}
          </p>
        </div>

        {/* Quick timeframe filter selector */}
        <div className="flex items-center space-x-1 bg-[#EBE8E0] p-1 rounded-xl border border-[#DCD6CB] self-start sm:self-auto">
          {(['today', 'all', 'month', 'year'] as TimePeriod[]).map((period) => {
            const labels: Record<TimePeriod, string> = {
              today: 'Jour',
              '7days': '7 Jours',
              all: 'Tous les Jours',
              month: '1 Mois',
              year: '1 An',
            };
            const isSelected = selectedPeriod === period || (period === 'all' && selectedPeriod === '7days');
            return (
              <button
                key={period}
                id={`btn-filter-period-${period}`}
                onClick={() => onSelectPeriod(period)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FAFAF7] text-[#1A1A1A] shadow-xs border border-[#DCD6CB]'
                    : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#F4F1EA]'
                }`}
              >
                {labels[period]}
              </button>
            );
          })}
        </div>
      </div>

      {/* The 4 Major Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: AUJOURD'HUI */}
        <div
          id="card-gain-today"
          onClick={() => onSelectPeriod('today')}
          className={`relative cursor-pointer bg-[#FAFAF7] rounded-2xl p-5 border transition-all duration-200 hover:shadow-sm ${
            selectedPeriod === 'today'
              ? 'ring-1 ring-[#2D5A43] border-[#2D5A43] bg-[#F7F9F8]'
              : 'border-[#DCD6CB] hover:border-[#B5AEA0]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border bg-[#E7EFEA] text-[#2D5A43] border-[#C3D9CD]">
              Jour J
            </span>
            <div className="p-2 rounded-xl bg-[#F4F1EA] border border-[#DCD6CB] text-[#4A463F]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#7A756D] mb-0.5 font-editorial">
              Aujourd'hui
            </p>
            <div className="flex items-baseline space-x-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight font-editorial">
                {formatCurrency(todayGain, currency)}
              </h3>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EBE8E0] flex items-center justify-between text-xs text-[#5C574F]">
            <span className="flex items-center gap-1">
              <PackageCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
              <strong>{formatNumber(todaySold)}</strong> vendus
            </span>
            <span className="text-[#8C877E] font-medium italic">
              {hasTodayData ? "Journal du jour" : "Dernier journal"}
            </span>
          </div>
        </div>

        {/* CARD 2: TOUS LES JOURS (TOTAL DES JOURS) */}
        <div
          id="card-gain-7days"
          onClick={() => onSelectPeriod('all')}
          className={`relative cursor-pointer bg-[#FAFAF7] rounded-2xl p-5 border transition-all duration-200 hover:shadow-sm ${
            selectedPeriod === 'all' || selectedPeriod === '7days'
              ? 'ring-1 ring-[#2D5A43] border-[#2D5A43] bg-[#F7F9F8]'
              : 'border-[#DCD6CB] hover:border-[#B5AEA0]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border bg-[#EBE8E0] text-[#3D3A34] border-[#DCD6CB]">
              Tous les Jours
            </span>
            <div className="p-2 rounded-xl bg-[#F4F1EA] border border-[#DCD6CB] text-[#4A463F]">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-xs font-medium text-[#7A756D] font-editorial">
                Total de Tous les Jours
              </p>
              {statsAllDays.daysCount > 0 ? (
                <span className="text-[10px] font-semibold text-[#5C574F] bg-[#EAE7DF] px-1.5 py-0.2 rounded font-mono-num">
                  {statsAllDays.daysCount} j
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-[#8C877E] bg-[#F4F1EA] px-1.5 py-0.5 rounded italic">
                  (0 {currency})
                </span>
              )}
            </div>

            <div className="flex items-baseline space-x-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight font-editorial">
                {statsAllDays.daysCount > 0
                  ? formatCurrency(statsAllDays.totalGain, currency)
                  : `(0 ${currency})`}
              </h3>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EBE8E0] flex items-center justify-between text-xs text-[#5C574F]">
            <span className="flex items-center gap-1">
              <PackageCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
              <strong>{formatNumber(statsAllDays.totalSold)}</strong> vendus
            </span>
            <span className="text-[#7A756D] font-medium font-mono-num text-[11px]">
              {statsAllDays.daysCount > 0
                ? `Moy: ${formatCurrency(statsAllDays.avgDailyGain, currency)}/j`
                : `(0 ${currency})`}
            </span>
          </div>
        </div>

        {/* CARD 3: 1 MOIS (AVEC SÉLECTEUR DE MOIS : JANVIER, FÉVRIER, MARS...) */}
        <div
          id="card-gain-month"
          onClick={() => onSelectPeriod('month')}
          className={`relative cursor-pointer bg-[#FAFAF7] rounded-2xl p-5 border transition-all duration-200 hover:shadow-sm ${
            selectedPeriod === 'month'
              ? 'ring-1 ring-[#2D5A43] border-[#2D5A43] bg-[#F7F9F8]'
              : 'border-[#DCD6CB] hover:border-[#B5AEA0]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border bg-[#EBE8E0] text-[#3D3A34] border-[#DCD6CB]">
              Mensuel
            </span>

            {/* Interactive Month Picker Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <select
                id="select-month-gain-picker"
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                title="Changer de mois (ex: Janvier, Février, Mars...)"
                className="text-[11px] font-bold bg-[#EAE7DF] hover:bg-[#DFDBD0] border border-[#C5BFB3] text-[#1B3628] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#2D5A43] cursor-pointer"
              >
                <optgroup label="Année en cours (2026)">
                  {MONTH_NAMES_FR.map((name, idx) => {
                    const key = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                    const isFull = (monthlyDataMap[key]?.daysCount || 0) >= 28;
                    const suffix = isFull ? ' ✓' : '';
                    return (
                      <option key={key} value={key}>
                        {name} {currentYear}{suffix}
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="Options avancées">
                  <option value="rolling-30">30 derniers jours (glissant)</option>
                  {/* Any other years present in data */}
                  {availableYears
                    .filter((y) => y !== currentYear)
                    .flatMap((y) =>
                      MONTH_NAMES_FR.map((name, idx) => {
                        const key = `${y}-${String(idx + 1).padStart(2, '0')}`;
                        const isFull = (monthlyDataMap[key]?.daysCount || 0) >= 28;
                        const suffix = isFull ? ' ✓' : '';
                        return (
                          <option key={key} value={key}>
                            {name} {y}{suffix}
                          </option>
                        );
                      })
                    )}
                </optgroup>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#2D5A43] mb-0.5 font-editorial flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{selectedMonthData.title}</span>
              </p>
              {hasFullMonth ? (
                <span className="text-[10px] font-semibold text-[#5C574F] bg-[#EAE7DF] px-1.5 py-0.2 rounded font-mono-num">
                  {selectedMonthData.daysCount} j
                </span>
              ) : selectedMonthData.daysCount > 0 ? (
                <span className="text-[10px] font-semibold text-[#8C877E] bg-[#F4F1EA] px-1.5 py-0.5 rounded italic font-mono-num">
                  Pas encore 1 mois ({selectedMonthData.daysCount} j)
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-[#8C877E] bg-[#F4F1EA] px-1.5 py-0.5 rounded italic">
                  Non débuté (0 {currency})
                </span>
              )}
            </div>

            <div className="flex items-baseline space-x-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight font-editorial">
                {hasFullMonth
                  ? formatCurrency(selectedMonthData.gain, currency)
                  : `(0 ${currency})`}
              </h3>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EBE8E0] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-[#5C574F]">
              <span className="flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
                <strong>{hasFullMonth ? formatNumber(selectedMonthData.soldUnits) : (selectedMonthData.daysCount > 0 ? `${formatNumber(selectedMonthData.soldUnits)} (en cours)` : '0')}</strong> vendus
              </span>
              <span className="text-[#7A756D] font-medium font-mono-num text-[11px]">
                {hasFullMonth 
                  ? `Moy: ${formatCurrency(selectedMonthData.avgGain, currency)}/j` 
                  : `(0 ${currency})`}
              </span>
            </div>

            {/* Quick button to toggle all months breakdown */}
            <button
              type="button"
              id="btn-toggle-all-months"
              onClick={(e) => {
                e.stopPropagation();
                setBreakdownTab('months');
                setShowDetailedBreakdown(true);
              }}
              className="w-full text-center text-[11px] font-bold text-[#2D5A43] bg-[#E7EFEA] hover:bg-[#D5E6DC] border border-[#C3D9CD] py-1 rounded-lg transition-colors cursor-pointer"
            >
              📅 Voir tous les mois (Jan, Fév, Mar...)
            </button>
          </div>
        </div>

        {/* CARD 4: 1 AN (AVEC SÉLECTEUR D'ANNÉE : 2026, 2025...) */}
        <div
          id="card-gain-year"
          onClick={() => onSelectPeriod('year')}
          className={`relative cursor-pointer bg-[#FAFAF7] rounded-2xl p-5 border transition-all duration-200 hover:shadow-sm ${
            selectedPeriod === 'year'
              ? 'ring-1 ring-[#2D5A43] border-[#2D5A43] bg-[#F7F9F8]'
              : 'border-[#DCD6CB] hover:border-[#B5AEA0]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border bg-[#FAF3E8] text-[#9C6B28] border-[#E8D9C0]">
              Annuel
            </span>

            {/* Interactive Year Picker Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <select
                id="select-year-gain-picker"
                value={selectedYearKey}
                onChange={(e) => setSelectedYearKey(e.target.value)}
                title="Changer d'année (ex: 2026, 2025...)"
                className="text-[11px] font-bold bg-[#FAF3E8] hover:bg-[#F2E5D0] border border-[#E8D9C0] text-[#7A521A] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#9C6B28] cursor-pointer"
              >
                {availableYears.map((y) => {
                  const yCount = yearlyDataMap[String(y)]?.daysCount || 0;
                  const isFull = yCount >= 350;
                  const suffix = isFull ? ' ✓' : '';
                  return (
                    <option key={y} value={String(y)}>
                      Année {y}{suffix}
                    </option>
                  );
                })}
                <option value="rolling-365">365 derniers jours (glissants)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#9C6B28] mb-0.5 font-editorial flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>{selectedYearData.title}</span>
              </p>
              {hasFullYear ? (
                <span className="text-[10px] font-semibold text-[#5C574F] bg-[#FAF3E8] px-1.5 py-0.2 rounded font-mono-num">
                  {selectedYearData.daysCount} j
                </span>
              ) : selectedYearData.daysCount > 0 ? (
                <span className="text-[10px] font-semibold text-[#8C877E] bg-[#FAF3E8] px-1.5 py-0.5 rounded italic font-mono-num">
                  Pas encore 1 an ({selectedYearData.daysCount} j)
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-[#8C877E] bg-[#FAF3E8] px-1.5 py-0.5 rounded italic">
                  Non débuté (0 {currency})
                </span>
              )}
            </div>

            <div className="flex items-baseline space-x-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight font-editorial">
                {hasFullYear
                  ? formatCurrency(selectedYearData.gain, currency)
                  : `(0 ${currency})`}
              </h3>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EBE8E0] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-[#5C574F]">
              <span className="flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
                <strong>{hasFullYear ? formatNumber(selectedYearData.soldUnits) : (selectedYearData.daysCount > 0 ? `${formatNumber(selectedYearData.soldUnits)} (en cours)` : '0')}</strong> vendus
              </span>
              <span className="text-[#7A756D] font-medium font-mono-num text-[11px]">
                {hasFullYear
                  ? (selectedYearData.monthsActive !== undefined && selectedYearData.monthsActive > 0
                      ? `${selectedYearData.monthsActive} mois actifs`
                      : `${selectedYearData.daysCount} jours`)
                  : `(0 ${currency})`}
              </span>
            </div>

            {/* Quick button to toggle yearly breakdown */}
            <button
              type="button"
              id="btn-toggle-all-years"
              onClick={(e) => {
                e.stopPropagation();
                setBreakdownTab('years');
                setShowDetailedBreakdown(true);
              }}
              className="w-full text-center text-[11px] font-bold text-[#7A521A] bg-[#FAF3E8] hover:bg-[#F2E5D0] border border-[#E8D9C0] py-1 rounded-lg transition-colors cursor-pointer"
            >
              🏆 Voir le récapitulatif par an
            </button>
          </div>
        </div>

      </div>

      {/* COMPREHENSIVE HISTORICAL BREAKDOWN: MOIS PRÉCÉDENTS (JAN, FÉV, MARS...) & ANNÉES */}
      <div className="mt-4 bg-[#FAFAF7] border border-[#DCD6CB] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBE8E0]">
          <div>
            <h3 className="text-base font-bold font-editorial text-[#1A1A1A] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2D5A43]" />
              <span>Tableau Détaillé des Gains : Mois Précédents & Années</span>
            </h3>
            <p className="text-xs text-[#7A756D] font-editorial">
              Le journal a débuté en Septembre 2026. Les mois ou années sans enregistrement affichent (0 {currency}).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#EBE8E0] p-1 rounded-xl border border-[#DCD6CB]">
              <button
                type="button"
                id="tab-breakdown-months"
                onClick={() => setBreakdownTab('months')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  breakdownTab === 'months'
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'text-[#5C574F] hover:text-[#1A1A1A]'
                }`}
              >
                Par Mois (Jan - Déc)
              </button>
              <button
                type="button"
                id="tab-breakdown-years"
                onClick={() => setBreakdownTab('years')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  breakdownTab === 'years'
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'text-[#5C574F] hover:text-[#1A1A1A]'
                }`}
              >
                Par Année (2026, 2025...)
              </button>
            </div>

            {breakdownTab === 'months' && (
              <select
                id="select-breakdown-year"
                value={breakdownYear}
                onChange={(e) => setBreakdownYear(parseInt(e.target.value, 10))}
                className="text-xs font-bold bg-[#FAFAF7] border border-[#DCD6CB] text-[#1A1A1A] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2D5A43] cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* TAB 1: BREAKDOWN PAR MOIS (JANVIER À DÉCEMBRE) */}
        {breakdownTab === 'months' && (
          <div className="pt-4 space-y-4">
            <div className="p-3 bg-[#F4F1EA] border border-[#DCD6CB] rounded-xl flex items-center gap-2 text-xs text-[#5C574F]">
              <Calendar className="w-4 h-4 text-[#2D5A43] shrink-0" />
              <span>
                <strong>Règle d'affichage :</strong> Si on n'a pas encore un mois complet ou une année complète, le gain indique <strong>(0 {currency})</strong>.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {MONTH_NAMES_FR.map((monthName, idx) => {
                const monthKey = `${breakdownYear}-${String(idx + 1).padStart(2, '0')}`;
                const mData = monthlyDataMap[monthKey];
                const hasData = mData && mData.daysCount > 0;
                const isFullMonth = mData && mData.daysCount >= 28;
                const isSelected = selectedMonthKey === monthKey;
                const isCurrentMonth = breakdownYear === currentYear && idx === currentMonthIdx;

                return (
                  <div
                    key={monthKey}
                    id={`card-month-${monthKey}`}
                    onClick={() => setSelectedMonthKey(monthKey)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#2D5A43] bg-white ring-1 ring-[#2D5A43] shadow-xs'
                        : hasData
                        ? 'border-[#DCD6CB] bg-[#F4F1EA]/70 hover:bg-white hover:border-[#B5AEA0]'
                        : 'border-[#EAE7DF] bg-[#FAFAF7] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-[#1A1A1A] font-editorial">
                          {monthName} {breakdownYear}
                        </span>
                        {isFullMonth ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EBE8E0] text-[#3D3A34]">
                            {mData.daysCount} j
                          </span>
                        ) : hasData ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E7EFEA] text-[#2D5A43] border border-[#C3D9CD]">
                            Pas encore 1 mois ({mData.daysCount} j)
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#8C877E] italic">
                            (0 {currency})
                          </span>
                        )}
                      </div>

                      <div className="my-1.5">
                        <div className="text-[11px] font-medium text-[#7A756D] font-editorial">
                          Gain Net
                        </div>
                        <div className={`text-lg font-extrabold font-editorial ${
                          isFullMonth ? 'text-[#2D5A43]' : 'text-[#8C877E]'
                        }`}>
                          {isFullMonth ? formatCurrency(mData.totalGain, currency) : `(0 ${currency})`}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#EBE8E0] flex items-center justify-between text-[11px] text-[#5C574F]">
                      <span>
                        <strong>{isFullMonth ? formatNumber(mData.totalSold) : (hasData ? `${formatNumber(mData.totalSold)} (en cours)` : 0)}</strong> vendus
                      </span>
                      {isFullMonth ? (
                        <span className="font-mono-num text-[10px] text-[#2D5A43] font-semibold">
                          Moy: {formatCurrency(mData.totalGain / mData.daysCount, currency)}/j
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#A09B90] italic">
                          (0 {currency})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total summary for the selected year */}
            <div className="p-4 bg-[#EAE7DF] border border-[#DCD6CB] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#2D5A43]" />
                <div>
                  <span className="font-bold text-[#1A1A1A]">Cumul Annuel {breakdownYear} : </span>
                  <span className="text-[#5C574F]">
                    {yearlyDataMap[String(breakdownYear)] && yearlyDataMap[String(breakdownYear)].daysCount >= 350
                      ? `${yearlyDataMap[String(breakdownYear)].daysCount} jours de vente • ${yearlyDataMap[String(breakdownYear)].monthsActiveCount} mois actifs`
                      : (yearlyDataMap[String(breakdownYear)] && yearlyDataMap[String(breakdownYear)].daysCount > 0
                          ? `Exercice en cours (${yearlyDataMap[String(breakdownYear)].daysCount} j enregistrés)`
                          : `Aucune donnée enregistrée`)}
                  </span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-[#5C574F] font-semibold">Total Gain Annuel :</span>
                <span className="text-xl font-extrabold text-[#2D5A43] font-editorial">
                  {yearlyDataMap[String(breakdownYear)] && yearlyDataMap[String(breakdownYear)].daysCount >= 350
                    ? formatCurrency(yearlyDataMap[String(breakdownYear)].totalGain, currency)
                    : `(0 ${currency})`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BREAKDOWN PAR ANNÉE (2026, 2025...) */}
        {breakdownTab === 'years' && (
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {availableYears.map((y) => {
                const yData = yearlyDataMap[String(y)];
                const hasData = yData && yData.daysCount > 0;
                const isFullYear = yData && yData.daysCount >= 350;
                const isSelected = selectedYearKey === String(y);

                return (
                  <div
                    key={y}
                    id={`card-year-${y}`}
                    onClick={() => setSelectedYearKey(String(y))}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#9C6B28] bg-white ring-1 ring-[#9C6B28] shadow-xs'
                        : hasData
                        ? 'border-[#DCD6CB] bg-[#FAF3E8]/60 hover:bg-white hover:border-[#E8D9C0]'
                        : 'border-[#EAE7DF] bg-[#FAFAF7]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-base text-[#1A1A1A] font-editorial">
                          Exercice Annuel {y}
                        </span>
                        {isFullYear ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FAF3E8] text-[#9C6B28]">
                            {yData.daysCount} j
                          </span>
                        ) : hasData ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF3E8] text-[#9C6B28] border border-[#E8D9C0]">
                            Pas encore 1 an ({yData.daysCount} j)
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#8C877E] italic">
                            (0 {currency})
                          </span>
                        )}
                      </div>

                      <div className="my-2">
                        <div className="text-xs font-medium text-[#7A756D] font-editorial">
                          Total Bénéfices / Gains
                        </div>
                        <div className={`text-2xl font-extrabold font-editorial ${
                          isFullYear ? 'text-[#9C6B28]' : 'text-[#8C877E]'
                        }`}>
                          {isFullYear ? formatCurrency(yData.totalGain, currency) : `(0 ${currency})`}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#EBE8E0] space-y-1 text-xs text-[#5C574F]">
                      <div className="flex justify-between">
                        <span>Unités vendues :</span>
                        <strong>{isFullYear ? formatNumber(yData.totalSold) : (hasData ? `${formatNumber(yData.totalSold)} (en cours)` : 0)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Jours comptabilisés :</span>
                        <strong>{hasData ? `${yData.daysCount} jours` : `(0 ${currency})`}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Mois actifs :</span>
                        <strong>{hasData ? `${yData.monthsActiveCount} mois` : '0 mois'}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};

