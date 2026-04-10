import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest } from '../services/api';
import { hasStoredSession, subscribeAuthState } from '../services/auth';

interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();
  const fallbackYears = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState(() => currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>(fallbackYears);

  useEffect(() => {
    let mounted = true;

    const loadYears = () => {
      if (!hasStoredSession()) {
        if (mounted) {
          setAvailableYears(fallbackYears);
          setSelectedYear(currentYear);
        }
        return;
      }

      apiRequest<Array<{ annee: number }>>('/years')
        .then((years) => {
          if (!mounted || !Array.isArray(years) || years.length === 0) return;
          const values = years
            .map((item) => Number(item.annee))
            .filter((year) => Number.isFinite(year))
            .sort((a, b) => b - a);
          if (values.length > 0) {
            setAvailableYears(values);
            setSelectedYear((existing) => (values.includes(existing) ? existing : values[0]));
          }
        })
        .catch(() => {
          if (mounted) setAvailableYears(fallbackYears);
        });
    };

    loadYears();
    const unsubscribe = subscribeAuthState(() => {
      loadYears();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [currentYear]);

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear, availableYears }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  const context = useContext(YearContext);
  if (context === undefined) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
}

// Generate available years (2020 to current year)
export const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2019 },
  (_, i) => new Date().getFullYear() - i
);
