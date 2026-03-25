"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const TableContext = createContext();

export function TableProvider({ children }) {
  const [tableInfo, setTableInfo] = useState(null);

  // Persist table info in sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("qr-table-info");
    if (stored) {
      setTableInfo(JSON.parse(stored));
    }
  }, []);

  const setTable = useCallback((info) => {
    setTableInfo(prev => {
      // Only update if actually different
      if (JSON.stringify(prev) === JSON.stringify(info)) {
        return prev;
      }
      if (info) {
        sessionStorage.setItem("qr-table-info", JSON.stringify(info));
      } else {
        sessionStorage.removeItem("qr-table-info");
      }
      return info;
    });
  }, []);

  return (
    <TableContext.Provider value={{ tableInfo, setTable }}>
      {children}
    </TableContext.Provider>
  );
}

export const useTable = () => useContext(TableContext);
