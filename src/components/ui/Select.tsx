import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", id, ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`rounded-lg border bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-cyan-400/40 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${error ? "border-red-400 dark:border-red-500" : ""} ${className}`}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span className="font-mono text-[10px] text-red-500">{error}</span>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
export default Select;
