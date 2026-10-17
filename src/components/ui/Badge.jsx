import React from 'react';

/**
 * Unified Badge Component
 * Replaces badge/tag className chains across the app
 * Variants: primary, secondary, success, warning, danger, info
 */
export default function Badge({
  children,
  variant = 'primary',
  size = 'sm',
  className = '',
  icon: Icon = null,
  ...props
}) {
  const baseClasses = 'font-semibold rounded-md border flex items-center gap-1 whitespace-nowrap';

  const variantClasses = {
    primary: 'bg-[#1D3557] text-[#A8DADC] border-[#457B9D]/40',
    secondary: 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)]',
    success: 'bg-[#06D6A0]/10 text-[#06D6A0] border-[#06D6A0]/40',
    warning: 'bg-[#EF476F]/10 text-[#EF476F] border-[#EF476F]/40',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-[#457B9D]/20 text-[#A8DADC] border-[#457B9D]/40',
    light: 'bg-[#457B9D] text-[#F1FAEE] border-[#457B9D]',
    free: 'bg-[#457B9D]/90 text-[#F1FAEE] border-[#A8DADC]/40',
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const finalClasses = `
    ${baseClasses}
    ${variantClasses[variant] || variantClasses.primary}
    ${sizeClasses[size] || sizeClasses.sm}
    ${className}
  `.trim();

  return (
    <span className={finalClasses} {...props}>
      {Icon && <Icon className="w-3 h-3" />}
      <span>{children}</span>
    </span>
  );
}
