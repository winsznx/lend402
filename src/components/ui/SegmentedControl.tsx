"use client";

interface Option {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SegmentedControl({ options, value, onChange, className = "" }: SegmentedControlProps) {
  return (
    <div className={"inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900 " + className} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={"rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors " + (value === opt.value ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
