import { TerminalCrimpRecord } from '../types/crimpHeight';
import { parseCrimpCsvLines } from './crimpParser';
import { rawCrimpCsv } from '../data/rawCrimpCsv';

let cachedRecords: TerminalCrimpRecord[] | null = null;
export const CUSTOM_CRIMP_CSV_KEY = 'raktar_custom_crimp_csv_v1';

export function getAllCrimpRecords(): TerminalCrimpRecord[] {
  if (!cachedRecords) {
    let csvData = rawCrimpCsv;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(CUSTOM_CRIMP_CSV_KEY);
        if (stored && stored.trim().length > 50) {
          csvData = stored;
        }
      } catch (e) {
        console.warn('Could not read custom crimp csv from localStorage:', e);
      }
    }
    const lines = csvData.split(/\r?\n/);
    cachedRecords = parseCrimpCsvLines(lines);
  }
  return cachedRecords;
}

export function reloadCrimpRecords(newCsvText?: string): { count: number } {
  if (newCsvText !== undefined) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        if (newCsvText.trim()) {
          localStorage.setItem(CUSTOM_CRIMP_CSV_KEY, newCsvText);
        } else {
          localStorage.removeItem(CUSTOM_CRIMP_CSV_KEY);
        }
      } catch (e) {
        console.warn('Could not save custom crimp csv:', e);
      }
    }
  }
  cachedRecords = null; // Invalidate cache
  const reloaded = getAllCrimpRecords();
  return { count: reloaded.length };
}

export function resetCrimpRecordsToDefault(): { count: number } {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(CUSTOM_CRIMP_CSV_KEY);
    } catch (e) {
      console.warn('Could not remove custom crimp csv:', e);
    }
  }
  cachedRecords = null;
  const reloaded = getAllCrimpRecords();
  return { count: reloaded.length };
}

export function getCustomCrimpCsv(): string | null {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(CUSTOM_CRIMP_CSV_KEY);
    } catch (e) {
      console.warn('Could not read custom crimp csv:', e);
    }
  }
  return null;
}

export function normalizeKey(val?: string): string {
  if (!val) return '';
  // Preserve dot (.) and characters after it (e.g. 2182120013 vs 2182120013.10)
  return val.trim().toLowerCase().replace(/[\s\-_/()]/g, '');
}

export function getCrimpHeightsForProduct(
  productId?: string,
  factoryCode?: string,
  name?: string
): TerminalCrimpRecord[] {
  if (!productId && !factoryCode && !name) return [];

  const all = getAllCrimpRecords();
  const normProdId = normalizeKey(productId);
  const normFactory = normalizeKey(factoryCode);
  const normName = normalizeKey(name);

  return all.filter((rec) => {
    const normRecProdId = normalizeKey(rec.productId);
    const normRecSaru = normalizeKey(rec.saruCode);
    const normRecRow2 = normalizeKey(rec.row2Code);

    // Exact matches on Product ID (preserves dots, distinguishing e.g. 2182120013 and 2182120013.10)
    if (normProdId) {
      if (normRecProdId && normRecProdId === normProdId) return true;
      if (normRecSaru && normRecSaru === normProdId) return true;
      if (normRecRow2 && normRecRow2 === normProdId) return true;
    }

    // Exact matches on Factory Code
    if (normFactory) {
      if (normRecSaru && normRecSaru === normFactory) return true;
      if (normRecProdId && normRecProdId === normFactory) return true;
      if (normRecRow2 && normRecRow2 === normFactory) return true;
    }

    // Exact matches on Name
    if (normName) {
      if (normRecProdId && normRecProdId === normName) return true;
      if (normRecSaru && normRecSaru === normName) return true;
      if (normRecRow2 && normRecRow2 === normName) return true;
    }

    return false;
  });
}
