import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`rounded-lg border bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-400/40 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600 ${error ? "border-red-400 dark:border-red-500" : ""} ${className}`}
          {...rest}
        />
        {error && (
          <span className="font-mono text-[10px] text-red-500">{error}</span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
export default Input;
