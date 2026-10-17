import React from 'react';
import { X } from 'lucide-react';

/**
 * InputField Component
 * Replaces search/input className chains
 * Variants: search, text, email
 */
export default function InputField({
  type = 'text',
  placeholder = '',
  value = '',
  onChange = null,
  onClear = null,
  icon: Icon = null,
  variant = 'search',
  className = '',
  ...props
}) {
  const baseClasses = 'w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] rounded-xl transition-all focus:outline-none focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20';

  const sizeClasses = {
    search: 'px-9 py-2 text-xs',
    text: 'px-4 py-2.5 text-sm',
    email: 'px-4 py-2.5 text-sm',
  };

  const finalClasses = `
    ${baseClasses}
    ${sizeClasses[variant] || sizeClasses.search}
    ${className}
  `.trim();

  return (
    <div className="relative w-full">
      {Icon && (
        <Icon className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={finalClasses}
        style={{
          paddingLeft: Icon ? '2.25rem' : undefined,
          paddingRight: value && onClear ? '2.25rem' : undefined,
        }}
        {...props}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-0.5 rounded-full transition-colors"
          title="Clear"
          type="button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
