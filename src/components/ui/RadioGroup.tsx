"use client";

import Radio from "./Radio";

interface Option {
  value: string;
  label: string;
}

interface RadioGroupProps {
  name: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function RadioGroup({ name, options, value, onChange, className = "" }: RadioGroupProps) {
  return (
    <div role="radiogroup" className={"flex flex-col gap-2 " + className}>
      {options.map((opt) => (
        <Radio
          key={opt.value}
          name={name}
          value={opt.value}
          checked={value === opt.value}
          onChange={() => onChange(opt.value)}
          label={opt.label}
        />
      ))}
    </div>
  );
}
