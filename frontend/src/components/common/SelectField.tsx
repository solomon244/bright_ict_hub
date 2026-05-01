import type { SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { label: string; value: string }[];
}

const SelectField = ({ label, options, onChange, value, name, disabled, required, ...props }: SelectFieldProps) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-stone-600">{label}</span>
    <select
      className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export default SelectField;

