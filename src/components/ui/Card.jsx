import React from 'react';

/**
 * Unified Card Component
 * Replaces card-surface className chains
 * Variants: default, elevated, ghost
 */
export default function Card({
  children,
  variant = 'default',
  hover = true,
  className = '',
  onClick = null,
  ...props
}) {
  const baseClasses = 'rounded-2xl border transition-all';

  const variantClasses = {
    default: 'bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm',
    elevated: 'bg-[var(--color-surface)] border-[var(--color-border)] shadow-lg',
    ghost: 'bg-transparent border-[var(--color-border)]',
  };

  const hoverClasses = hover && onClick ? 'hover:border-[#A8DADC] hover:-translate-y-0.5 cursor-pointer' : '';

  const finalClasses = `
    ${baseClasses}
    ${variantClasses[variant] || variantClasses.default}
    ${hoverClasses}
    ${className}
  `.trim();

  return (
    <div
      className={finalClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
