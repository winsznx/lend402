import { forwardRef, type InputHTMLAttributes } from "react";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = "", id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <label className={"inline-flex items-center gap-2 " + className}>
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="h-4 w-4 rounded border-slate-400 text-cyan-400 focus:ring-cyan-400/40 dark:border-slate-600 dark:bg-slate-900"
          {...rest}
        />
        {label && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {label}
          </span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
export default Checkbox;
