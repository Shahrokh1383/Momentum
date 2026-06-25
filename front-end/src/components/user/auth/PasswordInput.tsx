import React, { useState } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';

interface PasswordInputProps {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ id, label, registration }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="form-floating mb-2 position-relative">
      <input 
        type={showPassword ? 'text' : 'password'} 
        className="form-control" 
        id={id} 
        placeholder={label}
        {...registration}
      />
      <label htmlFor={id}>{label}</label>
      <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
        <i className={`far ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
      </button>
    </div>
  );
};

export default PasswordInput;