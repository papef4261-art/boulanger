import React, { useState, useMemo } from 'react';
import { DailyJournal, AppSettings, TimePeriod, BakeryBranch } from '../types';
import { ProfitMetricCards } from './ProfitMetricCards';
import { AnalyticsCharts } from './AnalyticsCharts';
import { 
  formatCurrency, 
} from '../utils/calculations';
import { 
  BarChart3, 
  Sparkles,
} from 'lucide-react';

interface GainsAndSummaryPageProps {
  journals: DailyJournal[];
  currentJournal: DailyJournal;
  settings: AppSettings;
  selectedPeriod: TimePeriod;
  currentUserId?: string;
  onSelectPeriod: (period: TimePeriod) => void;
  onSelectJournal: (journal: DailyJournal) => void;
  onUpdateSellerInfo?: (sellerName: string, updatedInfo: { phone?: string; age?: number | string; role?: string }) => void;
  bakeries?: BakeryBranch[];
  activeBakeryId?: string;
  onSelectBakery?: (bakeryId: string) => void;
}

export const GainsAndSummaryPage: React.FC<GainsAndSummaryPageProps> = ({
  journals,
  currentJournal,
  settings,
  selectedPeriod,
  currentUserId,
  onSelectPeriod,
  onUpdateSellerInfo,
  bakeries = [],
  activeBakeryId = 'boulangerie-principale',
}) => {
  const [simulationProduced, setSimulationProduced] = useState<number>(800);
  const [simulationSold, setSimulationSold] = useState<number>(750);
  const [simulationExpenses, setSimulationExpenses] = useState<number>(0);

  // Local perimeter state inside the page (can be switched independently or synced)
  const isAllBakeries = activeBakeryId === 'all';

  // Filter journals by bakery perimeter
  const filteredJournals = useMemo(() => {
    if (isAllBakeries) return journals;
    return journals.filter((j) => (j.bakeryId || bakeries[0]?.id) === activeBakeryId);
  }, [journals, activeBakeryId, isAllBakeries, bakeries]);

  const unitSellingPrice = currentJournal?.unitSellingPrice || settings.defaultSellingPrice;
  const unitReturnPrice = currentJournal?.unitReturnPrice || settings.defaultReturnPrice;
  const lossPerUnit = Math.max(0, unitSellingPrice - unitReturnPrice);

  // Simulation calculations
  const simReturned = Math.max(0, simulationProduced - simulationSold);
  const simGrossRevenue = simulationSold * unitSellingPrice;
  const simReturnLoss = simReturned * lossPerUnit;
  const simNetGain = simGrossRevenue + (simReturned * unitReturnPrice) - simulationExpenses;

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* SECTION CALCUL DES GAINS & BÉNÉFICES */}
      <section id="page-section-gains" className="space-y-4">
        <ProfitMetricCards
          journals={filteredJournals}
          currency={settings.currency}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={onSelectPeriod}
        />
      </section>

      {/* SECTION GRAPHIQUES D'ANALYSE & SIMULATEUR DE RENTABILITÉ */}
      <section id="page-section-graphiques-simulateur" className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        
        {/* Charts block (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#2D5A43]" />
            <h3 className="text-lg font-bold font-editorial text-[#1A1A1A]">
              3. Graphiques des Gains ({selectedPeriod === 'all' || selectedPeriod === 'today' ? 'Tous les Jours' : selectedPeriod === '7days' ? '7 Jours' : selectedPeriod === 'month' ? '1 Mois' : selectedPeriod === 'year' ? '1 An' : 'Tous les Jours'})
            </h3>
          </div>

          <AnalyticsCharts
            journals={filteredJournals}
            currency={settings.currency}
            selectedPeriod={selectedPeriod}
            currentUserId={currentUserId}
            onUpdateSellerInfo={onUpdateSellerInfo}
          />
        </div>

        {/* Quick Profit Simulator (1 col) */}
        <div className="bg-[#FAFAF7] border border-[#DCD6CB] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#2D5A43]" />
              <h4 className="font-bold text-base font-editorial text-[#1A1A1A]">
                Simulateur de Bénéfice
              </h4>
            </div>
            <p className="text-xs text-[#7A756D] font-editorial mb-4">
              Estimez votre gain net et vos pertes sur retours en fonction de vos volumes prévus.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#5C574F] font-semibold block mb-1 font-editorial">
                  Pains confiés / produits :
                </label>
                <input
                  type="number"
                  value={simulationProduced}
                  onChange={(e) => setSimulationProduced(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-white border border-[#DCD6CB] rounded-xl px-3 py-2 font-mono-num font-bold text-sm focus:ring-2 focus:ring-[#2D5A43] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#5C574F] font-semibold block mb-1 font-editorial">
                  Pains vendus prévus :
                </label>
                <input
                  type="number"
                  value={simulationSold}
                  onChange={(e) => setSimulationSold(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-white border border-[#DCD6CB] rounded-xl px-3 py-2 font-mono-num font-bold text-sm focus:ring-2 focus:ring-[#2D5A43] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#5C574F] font-semibold block mb-1 font-editorial">
                  Dépenses prévues ({settings.currency}) :
                </label>
                <input
                  type="number"
                  value={simulationExpenses}
                  onChange={(e) => setSimulationExpenses(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-white border border-[#DCD6CB] rounded-xl px-3 py-2 font-mono-num font-bold text-sm focus:ring-2 focus:ring-[#2D5A43] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="bg-[#1F1E1C] text-[#F4F1EA] p-4 rounded-xl space-y-2 border border-[#383530]">
            <div className="flex justify-between text-xs text-[#A6A095]">
              <span>Retours estimés :</span>
              <span className="font-mono-num font-bold text-[#F2D69B]">{simReturned} pains</span>
            </div>
            <div className="flex justify-between text-xs text-[#A6A095]">
              <span>Perte retours (-{lossPerUnit} CFA/u) :</span>
              <span className="font-mono-num font-bold text-[#F8C4C4]">
                -{formatCurrency(simReturnLoss, settings.currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-[#A6A095]">
              <span>Recette Vente ({unitSellingPrice} CFA) :</span>
              <span className="font-mono-num font-bold text-[#A3D9BC]">
                {formatCurrency(simGrossRevenue, settings.currency)}
              </span>
            </div>
            <div className="border-t border-[#383530] pt-2 flex justify-between items-baseline">
              <span className="text-xs font-bold text-white font-editorial">Gain Net Estimé :</span>
              <span className="text-lg font-bold text-[#A3D9BC] font-mono-num">
                {formatCurrency(simNetGain, settings.currency)}
              </span>
            </div>
          </div>

        </div>

      </section>

    </div>
  );
};
