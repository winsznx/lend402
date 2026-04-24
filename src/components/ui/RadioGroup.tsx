"use client";

import Radio from "./Radio";

interface Option {
  readonly value: string;
  readonly label: string;
}

interface RadioGroupProps {
  readonly name: string;
  readonly options: Option[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
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
