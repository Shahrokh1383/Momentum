import React from 'react';
import ThemeToggle from './ThemeToggle';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps) => {
  return (
    <div className="auth-page">
      <ThemeToggle />
      <div className="auth-container glass-panel">
        <div className="text-center">
          <img src="/assets/logo.jpg" alt="Momentum Logo" className="auth-logo" />
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;