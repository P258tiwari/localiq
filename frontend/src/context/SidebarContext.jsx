import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);

export function SidebarProvider({ children }) {
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [tabletExpanded, setTabletExpanded] = useState(false);

  return (
    <Ctx.Provider value={{ mobileOpen, setMobileOpen, tabletExpanded, setTabletExpanded }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSidebar = () => useContext(Ctx);
