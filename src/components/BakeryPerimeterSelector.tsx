import React, { useState, useRef, useEffect } from 'react';
import { BakeryBranch, DailyJournal } from '../types';
import { 
  Store, 
  ChevronDown, 
  Plus, 
  TrendingUp, 
  Calendar, 
  Check, 
  ArrowRight,
  UserCheck,
  Trash2
} from 'lucide-react';
import { formatDateFrench, formatCurrency } from '../utils/calculations';

interface BakeryPerimeterSelectorProps {
  bakeries: BakeryBranch[];
  activeBakeryId: string; // 'all' or specific bakery ID
  journals: DailyJournal[];
  onSelectBakery: (bakeryId: string) => void;
  onOpenAddBakeryModal: () => void;
  onNewJournalForActiveBakery: () => void;
  onNavigateToGains: () => void;
  onSelectJournal: (journal: DailyJournal) => void;
  onDeleteBakery?: (bakeryId: string) => void;
}

export const BakeryPerimeterSelector: React.FC<BakeryPerimeterSelectorProps> = ({
  bakeries,
  activeBakeryId,
  journals,
  onSelectBakery,
  onOpenAddBakeryModal,
  onNewJournalForActiveBakery,
  onNavigateToGains,
  onSelectJournal,
  onDeleteBakery,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeBakery = bakeries.find((b) => b.id === activeBakeryId) || bakeries[0];
  const isAllSelected = activeBakeryId === 'all';

  // Filter journals for active bakery
  const activeBakeryJournals = journals.filter((j) => {
    if (isAllSelected) return true;
    return (j.bakeryId || bakeries[0]?.id) === activeBakeryId;
  });

  const recentJournals = activeBakeryJournals.slice(0, 4);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button with Perimeter Icon */}
      <button
        type="button"
        id="btn-bakery-perimeter-selector"
        onClick={() => setIsOpen(!isOpen)}
        className="w-[65px] h-[46px] flex items-center justify-center space-x-1.5 px-2 rounded-xl border border-[#DCD6CB] bg-[#F4F1EA] hover:bg-white text-[#1A1A1A] transition-all shadow-xs cursor-pointer group shrink-0"
        title="Périmètre de la Boulangerie - Cliquez pour changer de boulangerie ou de journal"
      >
        <div
          className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs transition-transform group-hover:scale-105"
          style={{ backgroundColor: isAllSelected ? '#5C574F' : activeBakery?.color || '#2D5A43' }}
        >
          <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-[#7A756D] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 bg-[#FAFAF7] rounded-2xl shadow-xl border border-[#DCD6CB] overflow-hidden z-50 animate-fadeIn"
          style={{ maxHeight: '85vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-white border-b border-[#DCD6CB]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-editorial text-[#1A1A1A]">Périmètres Boulangeries</span>
              <span className="text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded-full bg-[#E7EFEA] text-[#2D5A43] border border-[#C3D9CD]">
                {bakeries.length} {bakeries.length > 1 ? 'boulangeries' : 'boulangerie'}
              </span>
            </div>
            <p className="text-[11px] text-[#7A756D] font-editorial mt-1 leading-snug">
              Basculez entre vos boulangeries pour isoler la saisie du journal de caisse et calculer les gains spécifiques.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="p-3 bg-[#F4F1EA] border-b border-[#DCD6CB]">
            <button
              type="button"
              id="btn-quick-add-bakery"
              onClick={() => {
                setIsOpen(false);
                onOpenAddBakeryModal();
              }}
              className="w-full flex items-center justify-center space-x-1.5 px-2.5 py-2 bg-white hover:bg-[#EBE8E0] text-[#1A1A1A] border border-[#DCD6CB] rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer text-center"
            >
              <Plus className="w-3.5 h-3.5 text-[#2D5A43]" />
              <span className="truncate">Nouv. Boulanger</span>
            </button>
          </div>

          {/* List of Bakeries */}
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-[#7A756D] uppercase tracking-wider font-editorial">
              Choisir une boulangerie
            </div>

            {/* Specific Bakeries */}
            {bakeries.map((b) => {
              const isCurrent = !isAllSelected && activeBakeryId === b.id;
              const count = journals.filter((j) => (j.bakeryId || bakeries[0]?.id) === b.id).length;

              return (
                <div
                  key={b.id}
                  className={`w-full rounded-xl flex items-center justify-between p-2.5 transition-colors cursor-pointer ${
                    isCurrent 
                      ? 'bg-white border border-[#2D5A43] shadow-xs' 
                      : 'hover:bg-white border border-transparent'
                  }`}
                  onClick={() => {
                    onSelectBakery(b.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-2.5 truncate pr-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs shadow-2xs shrink-0"
                      style={{ backgroundColor: b.color || '#2D5A43' }}
                    >
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#1A1A1A] truncate flex items-center gap-1.5">
                        <span className="truncate">{b.name}</span>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-[#E7EFEA] text-[#2D5A43] font-bold rounded-full border border-[#C3D9CD] shrink-0">
                            Actif
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#7A756D] truncate flex items-center gap-1.5">
                        {b.bakerName && (
                          <span className="truncate flex items-center gap-1">
                            <UserCheck className="w-2.5 h-2.5 text-[#2D5A43]" />
                            {b.bakerName}
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-mono-num">{count} journal{count > 1 ? 'x' : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    {isCurrent && <Check className="w-4 h-4 text-[#2D5A43]" />}
                    {bakeries.length > 1 && b.id !== 'boulangerie-principale' && onDeleteBakery && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Supprimer la boulangerie "${b.name}" ? Ses journaux seront conservés.`)) {
                            onDeleteBakery(b.id);
                          }
                        }}
                        className="p-1 text-[#7A756D] hover:text-[#8B3A3A] hover:bg-[#FAF0F0] rounded-lg transition-colors"
                        title="Supprimer cette boulangerie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Journal Juggling List */}
          <div className="p-3 bg-white border-t border-[#DCD6CB] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#7A756D] uppercase tracking-wider font-editorial flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#2D5A43]" />
                <span>Jongler entre les journaux récents</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToGains();
                }}
                className="text-[11px] text-[#2D5A43] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <span>Calculateur Gains</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentJournals.length === 0 ? (
              <p className="text-[11px] text-[#7A756D] italic py-1">
                Aucun journal enregistré pour cette boulangerie.
              </p>
            ) : (
              <div className="space-y-1">
                {recentJournals.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => {
                      onSelectJournal(j);
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-[#F4F1EA] flex items-center justify-between text-xs transition-colors cursor-pointer border border-[#EBE8E0]"
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold text-[#1A1A1A] block truncate">
                        {formatDateFrench(j.date)}
                      </span>
                      <span className="text-[10px] text-[#7A756D] truncate">
                        {j.title || `Journal du ${j.date}`}
                      </span>
                    </div>
                    <span className="font-mono-num font-bold text-[11px] text-[#2D5A43] shrink-0 bg-[#E7EFEA] px-2 py-0.5 rounded-md">
                      {formatCurrency(j.summary?.netGain || 0, 'CFA')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
