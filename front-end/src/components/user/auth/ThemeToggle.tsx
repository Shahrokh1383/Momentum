import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = 'theme-toggle-btn' }) => {
  const [theme, setTheme] = useState<string>(
    () => localStorage.getItem('momentum-theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('momentum-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <button
      className={className}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onClick={toggleTheme}
      type="button"
    >
      <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`} />
    </button>
  );
};

export default ThemeToggle;