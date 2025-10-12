import React, { createContext, useContext, useState } from 'react';
import { clsx } from 'clsx';

// Tabs Context
const TabsContext = createContext();

// Main Tabs Component
export const Tabs = ({ children, value, onValueChange, defaultValue, className }) => {
  const [selectedTab, setSelectedTab] = useState(value || defaultValue);

  const handleTabChange = (newValue) => {
    setSelectedTab(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ selectedTab: value || selectedTab, onTabChange: handleTabChange }}>
      <div className={clsx('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

// TabsList Component
export const TabsList = ({ children, className }) => {
  return (
    <div className={clsx(
      'inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500',
      className
    )}>
      {children}
    </div>
  );
};

// TabsTrigger Component
export const TabsTrigger = ({ children, value, className, disabled = false }) => {
  const { selectedTab, onTabChange } = useContext(TabsContext);
  const isSelected = selectedTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => !disabled && onTabChange(value)}
      className={clsx(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5',
        'text-sm font-medium ring-offset-white transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'bg-white text-slate-950 shadow-sm'
          : 'text-slate-500 hover:text-slate-900',
        className
      )}
    >
      {children}
    </button>
  );
};

// TabsContent Component
export const TabsContent = ({ children, value, className, forceMount = false }) => {
  const { selectedTab } = useContext(TabsContext);
  const isSelected = selectedTab === value;

  if (!forceMount && !isSelected) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      hidden={!isSelected}
      className={clsx(
        'mt-2 ring-offset-white focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
        isSelected ? 'animate-fade-in' : '',
        className
      )}
    >
      {children}
    </div>
  );
};