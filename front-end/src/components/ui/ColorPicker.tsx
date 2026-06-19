import React, { useRef } from 'react';
import '@/styles/ui/color-picker.css';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(value || '');

  return (
    <div 
      className="color-picker__trigger settings-form__input d-flex align-items-center gap-2"
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <div 
        className="color-picker__swatch"
        style={{ backgroundColor: isValidHex ? value : '#cbd5e1' }}
      />
      <span className="color-picker__text">
        {value || 'Select a color...'}
      </span>
      <input
        ref={inputRef}
        type="color"
        className="color-picker__input"
        value={isValidHex ? value : '#4F46E5'}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default ColorPicker;