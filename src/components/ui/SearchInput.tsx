"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly onClear?: () => void;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = "", onClear, value, ...rest }, ref) => {
    return (
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
          aria-hidden
        >
          <circle cx={11} cy={11} r={8} />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          ref={ref}
          type="search"
          value={value}
          className={`w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 font-mono text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-400/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600 ${className}`}
          {...rest}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
export default SearchInput;
