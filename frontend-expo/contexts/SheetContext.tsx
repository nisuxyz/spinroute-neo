import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SheetContextType {
  isRecordedTripsSheetOpen: boolean;
  openRecordedTripsSheet: () => void;
  closeRecordedTripsSheet: () => void;
}

const SheetContext = createContext<SheetContextType | undefined>(undefined);

export const SheetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRecordedTripsSheetOpen, setIsRecordedTripsSheetOpen] = useState(false);

  const openRecordedTripsSheet = () => {
    setIsRecordedTripsSheetOpen(true);
  };

  const closeRecordedTripsSheet = () => {
    setIsRecordedTripsSheetOpen(false);
  };

  return (
    <SheetContext.Provider
      value={{
        isRecordedTripsSheetOpen,
        openRecordedTripsSheet,
        closeRecordedTripsSheet,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};

export const useSheetContext = () => {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error('useSheetContext must be used within a SheetProvider');
  }
  return context;
};
