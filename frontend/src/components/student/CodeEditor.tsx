import type { KeyboardEvent } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  rows?: number;
  disabled?: boolean;
};

/** Lightweight code box (no heavy editor library: friendlier to low-bandwidth connections). Tab inserts two spaces. */
const CodeEditor = ({ value, onChange, label, rows = 10, disabled }: Props) => {
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    onChange(`${value.slice(0, start)}  ${value.slice(end)}`);
    requestAnimationFrame(() => {
      el.selectionStart = start + 2;
      el.selectionEnd = start + 2;
    });
  };

  return (
    <textarea
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      rows={rows}
      disabled={disabled}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      maxLength={20000}
      className="w-full resize-y rounded-xl border border-stone-200 bg-stone-950 p-3 font-mono text-sm leading-relaxed text-stone-100 outline-none ring-primary/30 focus:ring-2"
    />
  );
};

export default CodeEditor;
