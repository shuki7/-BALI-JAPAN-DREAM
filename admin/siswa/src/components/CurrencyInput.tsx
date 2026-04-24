import React from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  style?: React.CSSProperties;
  placeholder?: string;
  suffix?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, style, placeholder, suffix }) => {
  // Format number with commas
  const formatDisplay = (num: number) => {
    if (num === 0) return '';
    return num.toLocaleString('id-ID');
  };

  const [displayValue, setDisplayValue] = React.useState(formatDisplay(value));

  // Sync internal display value when external value changes (but not when we are typing)
  React.useEffect(() => {
    const formatted = formatDisplay(value);
    if (formatted !== displayValue && (value !== 0 || displayValue !== '')) {
      setDisplayValue(formatted);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const numValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
    
    // Update display value with commas
    setDisplayValue(numValue === 0 ? '' : numValue.toLocaleString('id-ID'));
    
    // Notify parent
    onChange(numValue);
  };

  const handleBlur = () => {
    if (value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toLocaleString('id-ID'));
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder || '0'}
        style={{
          ...style,
          paddingRight: suffix ? '45px' : style?.paddingRight,
        }}
      />
      {suffix && (
        <span style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '11px',
          fontWeight: 700,
          color: '#888',
          pointerEvents: 'none'
        }}>
          {suffix}
        </span>
      )}
    </div>
  );
};
