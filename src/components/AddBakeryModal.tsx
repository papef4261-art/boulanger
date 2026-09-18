import React, { useState, useEffect } from 'react';
import { BakeryBranch } from '../types';
import { X, Store, UserCheck, Phone, MapPin, Check, Palette, Tag } from 'lucide-react';

interface AddBakeryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBakery: (newBakery: BakeryBranch) => void;
  currency?: string;
  defaultSellingPrice?: number;
  defaultReturnPrice?: number;
  defaultCostPrice?: number;
}

const COLOR_OPTIONS = [
  { label: 'Vert Forêt', value: '#2D5A43' },
  { label: 'Ambre Doré', value: '#9C6B28' },
  { label: 'Bleu Océan', value: '#1E40AF' },
  { label: 'Terracotta', value: '#9A3412' },
  { label: 'Bordeaux', value: '#831843' },
  { label: 'Ardoise', value: '#334155' },
];

export const AddBakeryModal: React.FC<AddBakeryModalProps> = ({
  isOpen,
  onClose,
  onAddBakery,
  currency = 'CFA',
  defaultSellingPrice = 175,
  defaultReturnPrice = 50,
  defaultCostPrice = 100,
}) => {
  const [name, setName] = useState('');
  const [bakerName, setBakerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [productName, setProductName] = useState('Pain / Baguette');
  const [sellingPrice, setSellingPrice] = useState(defaultSellingPrice);
  const [returnPrice, setReturnPrice] = useState(defaultReturnPrice);
  const [costPrice, setCostPrice] = useState(defaultCostPrice);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[1].value); // Ambre Doré par défaut pour la 2ème boulangerie
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Veuillez entrer le nom de la nouvelle boulangerie ou du point de vente.');
      return;
    }

    const cleanName = name.trim();
    const id = `boulangerie-${Date.now()}`;
    const newBakery: BakeryBranch = {
      id,
      name: cleanName,
      bakerName: bakerName.trim() || 'Boulanger Responsable',
      phone: phone.trim() || '',
      address: address.trim() || '',
      color: selectedColor,
      defaultProductName: productName.trim() || 'Pain / Baguette',
      defaultSellingPrice: Number(sellingPrice) || defaultSellingPrice,
      defaultReturnPrice: Number(returnPrice) || defaultReturnPrice,
      defaultCostPrice: Number(costPrice) || defaultCostPrice,
      createdAt: new Date().toISOString(),
    };

    onAddBakery(newBakery);
    // Reset form
    setName('');
    setBakerName('');
    setPhone('');
    setAddress('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F1E1C]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#FAFAF7] rounded-2xl shadow-2xl max-w-lg w-full border border-[#DCD6CB] overflow-hidden my-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#DCD6CB] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="p-2.5 rounded-xl text-white shadow-xs"
              style={{ backgroundColor: selectedColor }}
            >
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] font-editorial">
                Ajouter une nouvelle boulangerie
              </h3>
              <p className="text-xs text-[#7A756D] font-editorial">
                Nouveau boulanger & périmètre indépendant de caisse et gains
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#5C574F] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F4F1EA] transition-colors cursor-pointer"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#FAF0F0] border border-[#8B3A3A]/30 rounded-xl text-[#8B3A3A] text-xs">
              {errorMsg}
            </div>
          )}

          {/* Bakery Name & Manager/Baker */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#1A1A1A] mb-1 font-editorial flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#2D5A43]" />
                <span>Nom de la Boulangerie / Point de vente *</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Boulangerie Fass, Boulangerie Médina, Kiosque 2..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-[#DCD6CB] rounded-xl focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43] text-[#1A1A1A]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1 font-editorial flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
                  <span>Boulanger / Gérant</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Amadou Diallo, Moussa..."
                  value={bakerName}
                  onChange={(e) => setBakerName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-[#DCD6CB] rounded-xl focus:outline-none focus:border-[#2D5A43] text-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1 font-editorial flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#2D5A43]" />
                  <span>Téléphone contact</span>
                </label>
                <input
                  type="tel"
                  placeholder="Ex: +221 77 000 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-[#DCD6CB] rounded-xl focus:outline-none focus:border-[#2D5A43] text-[#1A1A1A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1A1A] mb-1 font-editorial flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2D5A43]" />
                <span>Adresse / Emplacement</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Fass Paillote, Marché HLM..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-[#DCD6CB] rounded-xl focus:outline-none focus:border-[#2D5A43] text-[#1A1A1A]"
              />
            </div>
          </div>

          {/* Pricing defaults for this bakery */}
          <div className="bg-[#EBE8E0]/60 p-3.5 rounded-xl border border-[#DCD6CB] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1A1A1A] font-editorial flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#2D5A43]" />
                <span>Tarifs par défaut ({currency})</span>
              </span>
              <span className="text-[10px] text-[#7A756D]">Modifiables par journal</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-[#5C574F] font-semibold mb-0.5">Prix Vente</label>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#DCD6CB] rounded-lg font-mono-num font-bold text-[#2D5A43] text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#5C574F] font-semibold mb-0.5">Prix Reprise</label>
                <input
                  type="number"
                  value={returnPrice}
                  onChange={(e) => setReturnPrice(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#DCD6CB] rounded-lg font-mono-num font-bold text-[#9C6B28] text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#5C574F] font-semibold mb-0.5">Coût Revient</label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#DCD6CB] rounded-lg font-mono-num font-bold text-[#5C574F] text-center"
                />
              </div>
            </div>
          </div>

          {/* Color tag selector */}
          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5 font-editorial flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#2D5A43]" />
              <span>Couleur d'identification du périmètre</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    selectedColor === c.value
                      ? 'border-[#1A1A1A] shadow-xs ring-1 ring-[#1A1A1A] font-bold bg-white'
                      : 'border-[#DCD6CB] bg-[#F4F1EA] hover:bg-white text-[#5C574F]'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.value }} />
                  <span>{c.label}</span>
                  {selectedColor === c.value && <Check className="w-3 h-3 text-[#1A1A1A] ml-0.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#DCD6CB] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#EBE8E0] rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              id="btn-confirm-add-bakery"
              className="px-4 py-2 bg-[#2D5A43] hover:bg-[#234735] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Créer et basculer sur cette boulangerie</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
