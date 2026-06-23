import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { UserSettings } from '@/types/user';

const PreferencesForm: React.FC = () => {
  const { user } = useAuth();
  const { updatePreferences, isUpdatingPreferences } = useProfile();

  const [timezone, setTimezone] = useState(user?.settings?.timezone || 'UTC');
  const [theme, setTheme] = useState<UserSettings['theme']>(user?.settings?.theme || 'system');
  const [dateFormat, setDateFormat] = useState(user?.settings?.date_format || 'Y-m-d');
  const [prefMsg, setPrefMsg] = useState('');

  const timezones = useMemo<string[]>(() => {
    try { 
      return (Intl as any).supportedValuesOf('timezone'); 
    } catch { 
      return ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tehran', 'Asia/Tokyo']; 
    }
  }, []);

  useEffect(() => {
    if (user?.settings) {
      setTimezone(user.settings.timezone);
      setTheme(user.settings.theme);
      setDateFormat(user.settings.date_format);
    }
  }, [user]);

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefMsg('');
    try {
      await updatePreferences({ timezone, theme, date_format: dateFormat });
      setPrefMsg('Preferences updated successfully!');
    } catch (err) {
      setPrefMsg('Failed to update preferences.');
    }
  };

  return (
    <form className="settings-form" onSubmit={handlePreferencesSubmit}>
      <div className="settings-form__group">
        <label className="settings-form__label">Timezone</label>
        <select className="settings-form__input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
      
      <div className="settings-form__group">
        <label className="settings-form__label">Theme</label>
        <div className="settings-form__radio-group">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <label key={t} className={`settings-form__radio-label ${theme === t ? 'settings-form__radio-label--active' : ''}`}>
              <input 
                type="radio" 
                name="theme" 
                value={t} 
                checked={theme === t} 
                onChange={() => setTheme(t)} 
                className="settings-form__radio-input"
              />
              <i className={`fas ${t === 'light' ? 'fa-sun' : t === 'dark' ? 'fa-moon' : 'fa-circle-half-stroke'}`}></i>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </label>
          ))}
        </div>
      </div>
      
      <div className="settings-form__group">
        <label className="settings-form__label">Date Format</label>
        <select className="settings-form__input" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
          <option value="Y-m-d">YYYY-MM-DD</option>
          <option value="d/m/Y">DD/MM/YYYY</option>
          <option value="m/d/Y">MM/DD/YYYY</option>
        </select>
      </div>
      
      {prefMsg && <p className="settings-form__message settings-form__message--success">{prefMsg}</p>}
      
      <button type="submit" className="settings-form__btn" disabled={isUpdatingPreferences}>
        {isUpdatingPreferences ? 'Saving...' : 'Save Preferences'}
      </button>
    </form>
  );
};

export default PreferencesForm;