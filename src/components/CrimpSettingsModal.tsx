import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Upload,
  Database,
  ArrowRight,
  Layers,
  RotateCcw
} from 'lucide-react';
import { Product } from '../types/product';
import {
  getAllCrimpRecords,
  reloadCrimpRecords,
  resetCrimpRecordsToDefault,
  getCustomCrimpCsv
} from '../services/crimpHeightService';
import { syncTerminalFejRelationsFromCrimpTable } from '../services/terminalFejService';

interface CrimpSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRelationsUpdated?: () => void;
  onResetWarehouseStock?: () => void;
}

export const CrimpSettingsModal: React.FC<CrimpSettingsModalProps> = ({
  isOpen,
  onClose,
  products,
  onRelationsUpdated,
  onResetWarehouseStock
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const currentRecords = getAllCrimpRecords();
  const hasCustomCsv = Boolean(getCustomCrimpCsv());

  const handleSyncFromTable = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncTerminalFejRelationsFromCrimpTable(products);
      if (res.success) {
        setSyncResult({
          success: true,
          message: `Sikeres frissítés! ${res.crimpRecordsCount} db sarumagasság rekord feldolgozva, ${res.generatedCount} db saru ↔ saruzófej kapcsolat automatikusan frissítve.`,
          count: res.generatedCount
        });
        if (onRelationsUpdated) {
          onRelationsUpdated();
        }
      } else {
        setSyncResult({
          success: false,
          message: res.error || 'Hiba történt a táblázat kapcsolatainak frissítésekor.'
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.message || 'Hiba történt a szinkronizáció során.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) {
      setUploadedFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      setFileError('Kérjük, CSV kiterjesztésű fájlt válasszon ki!');
      setUploadedFile(null);
      return;
    }
    setUploadedFile(file);
  };

  const handleApplyUploadedCsv = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);
    setFileError(null);
    setSyncResult(null);

    try {
      const text = await uploadedFile.text();
      if (!text || text.trim().length < 50) {
        setFileError('A kiválasztott fájl üres vagy érvénytelen!');
        setIsUploading(false);
        return;
      }

      reloadCrimpRecords(text);
      const res = await syncTerminalFejRelationsFromCrimpTable(products);

      setSyncResult({
        success: true,
        message: `Új sarumagasság táblázat sikeresen feltöltve és alkalmazva! ${res.crimpRecordsCount} db rekord betöltve, ${res.generatedCount} db kapcsolat szinkronizálva.`,
        count: res.generatedCount
      });
      setUploadedFile(null);
      if (onRelationsUpdated) {
        onRelationsUpdated();
      }
    } catch (err: any) {
      setFileError(err?.message || 'Nem sikerült beolvasni a CSV fájlt.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      resetCrimpRecordsToDefault();
      const res = await syncTerminalFejRelationsFromCrimpTable(products);
      setSyncResult({
        success: true,
        message: `Gyári alapértelmezett sarumagasság táblázat visszaállítva! ${res.crimpRecordsCount} db rekord aktív.`,
        count: res.generatedCount
      });
      if (onRelationsUpdated) {
        onRelationsUpdated();
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.message || 'Hiba történt a gyári adatok visszaállításakor.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#DBD8D5] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold leading-tight">Sarumagasság Táblázat Beállítások</h3>
              <p className="text-xs text-orange-100">
                Saru és saruzófej adatok szinkronizálása a sarumagasság táblázatból
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Ablak bezárása"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#211E1B]">
          {/* Status Overview Card */}
          <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-orange-700 shrink-0" />
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-orange-950 block">
                  Táblázat Állapota
                </span>
                <span className="text-sm font-bold text-stone-900">
                  {currentRecords.length} db sarumagasság rekord betöltve
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                hasCustomCsv
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-emerald-100 text-emerald-950 border-emerald-300'
              }`}>
                {hasCustomCsv ? 'Egyéni feltöltött táblázat' : 'Gyári alapértelmezett táblázat'}
              </span>
            </div>
          </div>

          {/* Sync Result Banner */}
          {syncResult && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 border animate-fadeIn ${
                syncResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              {syncResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <span className="font-bold block">
                  {syncResult.success ? 'Sikeres művelet!' : 'Hiba történt'}
                </span>
                <span>{syncResult.message}</span>
              </div>
            </div>
          )}

          {/* 1. Primary Action: Refresh / Synchronize from Table */}
          <div className="p-5 rounded-2xl border-2 border-orange-300 bg-white shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-orange-600" />
                  <span>Adatok frissítése a sarumagasság táblázatból</span>
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Újraértékeli a táblázatban szereplő saru kódokat és saruzófej (N-sorozat) beállításokat,
                  automatikusan felépíti a kapcsolódó saruk és saruzófejek listáját, és elmenti az aktív adatbázisba.
                  A manuálisan leválasztott tételek kizárása érvényben marad.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSyncFromTable}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-extrabold text-sm sm:text-base shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing ? 'Frissítés folyamatban...' : 'Adatok & Kapcsolatok Frissítése Most'}
              </span>
            </button>
          </div>

          {/* 2. Optional: Upload new Crimp CSV */}
          <div className="p-5 rounded-2xl border border-stone-200 bg-[#FBFBFA] space-y-3">
            <h4 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-stone-700" />
              <span>Új Sarumagasság CSV feltöltése (opcionális)</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Ha frissített sarumagasság mérési táblázatot kapott (pl. új sarukkal vagy módosított fejkódokkal),
              itt töltheti fel a helyettesítő CSV fájlt.
            </p>

            <div className="space-y-2">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                disabled={isUploading || isSyncing}
                className="block w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-stone-300 file:text-xs file:font-bold file:bg-white file:text-stone-800 hover:file:bg-orange-50 cursor-pointer"
              />

              {fileError && (
                <div className="text-xs text-red-600 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {uploadedFile && (
                <button
                  type="button"
                  onClick={handleApplyUploadedCsv}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-extrabold transition-colors cursor-pointer"
                >
                  <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                  <span>Feltöltött CSV alkalmazása és frissítés</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Reset to Factory Default */}
          {hasCustomCsv && (
            <div className="p-4 rounded-xl border border-stone-200 bg-white flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Gyári alapértelmezett táblázat visszaállítása
                </span>
                <span className="text-xs text-stone-500">
                  Törli a feltöltött egyéni táblázatot és visszaállítja a gyári sarumagasság CSV-t.
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
                <span>Visszaállítás</span>
              </button>
            </div>
          )}

          {/* 4. Teljes raktárkészlet nullázása (0 db) */}
          <div className="p-5 rounded-2xl border-2 border-rose-200 bg-rose-50/60 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-rose-950 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>Teljes raktárkészlet beállítása 0 db-ra</span>
                </h4>
                <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                  Nullázza az összes termék raktári darabszámát (minden termék készlete 0 db lesz). A felvett raktári pozíciók (helyek) és a termékkatalógus megmaradnak a rendszerben.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onResetWarehouseStock) {
                  onResetWarehouseStock();
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Teljes raktárkészlet nullázása (0 db)</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#DBD8D5] bg-[#F8F9FA] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#DBD8D5]/60 hover:bg-[#DBD8D5] text-[#211E1B] font-bold text-sm transition-colors cursor-pointer"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
