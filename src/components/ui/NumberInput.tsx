import { forwardRef, type InputHTMLAttributes } from "react";

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ label, error, prefix, suffix, className = "", id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 font-mono text-xs text-slate-500">{prefix}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            type="number"
            inputMode="decimal"
            className={"w-full rounded-lg border bg-white py-2 font-mono text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-400/40 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 " + (prefix ? "pl-8 " : "pl-3 ") + (suffix ? "pr-8 " : "pr-3 ") + (error ? "border-red-400 dark:border-red-500 " : "") + className}
            {...rest}
          />
          {suffix && (
            <span className="absolute right-3 font-mono text-xs text-slate-500">{suffix}</span>
          )}
        </div>
        {error && <span className="font-mono text-[10px] text-red-500">{error}</span>}
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";
export default NumberInput;
