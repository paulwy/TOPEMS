import { useState, useCallback } from 'react';
import { sanitizeInput } from '@/lib/security';

interface InputSanitizerProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'textarea';
  placeholder?: string;
  className?: string;
}

export const InputSanitizer = ({
  value,
  onChange,
  type = 'text',
  placeholder,
  className,
}: InputSanitizerProps) => {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const sanitized = sanitizeInput(e.target.value);
    setLocalValue(sanitized);
    onChange(sanitized);
  }, [onChange]);

  if (type === 'textarea') {
    return (
      <textarea
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default InputSanitizer;