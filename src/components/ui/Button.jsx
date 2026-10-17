import React from 'react';

/**
 * Unified Button Component
 * Replaces 50+ duplicate className chains across the app
 * Variants: primary, secondary, ghost, danger, success
 * Sizes: sm, md, lg
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  isLoading = false,
  icon: Icon = null,
  iconPosition = 'left',
  ...props
}) {
  const baseClasses = 'font-semibold transition-all rounded-xl border btn-press flex items-center justify-center gap-1.5 whitespace-nowrap';

  const variantClasses = {
    primary: 'bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] border-[#457B9D] shadow-sm',
    secondary: 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[#457B9D]',
    ghost: 'bg-transparent hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border-[var(--color-border)]',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20',
    success: 'bg-[#06D6A0]/10 hover:bg-[#06D6A0]/20 text-[#06D6A0] border-[#06D6A0]/40',
    enrolled: 'bg-[#457B9D]/20 text-[#A8DADC] border-[#457B9D]/40 hover:border-[#457B9D]',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-xs',
    lg: 'px-5 py-3 text-sm',
  };

  const finalClasses = `
    ${baseClasses}
    ${variantClasses[variant] || variantClasses.primary}
    ${sizeClasses[size] || sizeClasses.md}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  return (
    <button
      className={finalClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-3.5 h-3.5" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-3.5 h-3.5" />}
        </>
      )}
    </button>
  );
}
