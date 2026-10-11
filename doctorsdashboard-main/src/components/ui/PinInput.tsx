import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react';

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function PinInput({ length = 6, onComplete, disabled = false, error = false }: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      refs.current[index]?.focus();
      refs.current[index]?.select();
    }
  };

  const checkComplete = (newValues: string[]) => {
    const pin = newValues.join('');
    if (pin.length === length && !newValues.includes('')) {
      onComplete(pin);
    }
  };

  const handleChange = (index: number, raw: string) => {
    const char = raw.replace(/\D/g, '').slice(-1);
    const newValues = [...values];
    newValues[index] = char;
    setValues(newValues);
    if (char && index < length - 1) {
      focusInput(index + 1);
    }
    checkComplete(newValues);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (values[index]) {
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
      } else if (index > 0) {
        focusInput(index - 1);
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    } else if (e.key === 'Enter') {
      const pin = values.join('');
      if (pin.length === length && !values.includes('')) {
        onComplete(pin);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const newValues = Array(length).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setValues(newValues);
    if (pasted.length === length) {
      checkComplete(newValues);
      refs.current[length - 1]?.blur();
    } else {
      focusInput(pasted.length);
    }
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="Six-digit access PIN">
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={val}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`PIN digit ${i + 1}`}
          className={`h-12 w-10 sm:h-14 sm:w-12 rounded-lg border-2 bg-white text-center text-xl font-bold text-navy-900 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 sm:text-2xl ${
            error
              ? 'border-error-300 focus:border-error-500'
              : val
                ? 'border-teal-500'
                : 'border-navy-200 focus:border-teal-500'
          }`}
        />
      ))}
    </div>
  );
}
