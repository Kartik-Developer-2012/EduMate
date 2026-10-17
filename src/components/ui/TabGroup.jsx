import React from 'react';

/**
 * TabGroup Component
 * Replaces tab switcher className chains
 * Manages tab state and styling
 */
export default function TabGroup({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  className = '',
}) {
  const baseClasses = 'flex items-center gap-1.5 p-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-x-auto scrollbar-none';

  const tabBaseClasses = 'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 btn-press';

  const tabActiveClasses = 'bg-[#457B9D] text-[#F1FAEE] shadow-sm';
  const tabInactiveClasses = 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]';

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[11px]',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  return (
    <div className={`${baseClasses} ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChange?.(tab.id)}
            className={`
              ${tabBaseClasses}
              ${sizeClasses[size] || sizeClasses.md}
              ${isActive ? tabActiveClasses : tabInactiveClasses}
            `}
            title={tab.title || tab.label}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-[#A8DADC] text-[#1D3557]'
                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
