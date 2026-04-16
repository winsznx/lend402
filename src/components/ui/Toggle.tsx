"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function Toggle({ checked, onChange, label, disabled, className = "" }: ToggleProps) {
  return (
    <label className={"inline-flex items-center gap-2 " + className + (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={"relative inline-flex h-5 w-9 items-center rounded-full transition-colors " + (checked ? "bg-cyan-400" : "bg-slate-600")}
      >
        <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (checked ? "translate-x-4" : "translate-x-0.5")} />
      </button>
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
          {label}
        </span>
      )}
    </label>
  );
}
