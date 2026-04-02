import { createContext, useContext, useState, ReactNode } from 'react';

interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear }}>
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
