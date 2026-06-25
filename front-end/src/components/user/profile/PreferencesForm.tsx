import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useProfile } from '@/hooks/useProfile';
import { preferencesSchema, PreferencesFormData } from '@/validation/profileSchema';

const PreferencesForm: React.FC = () => {
  const { user } = useCurrentUser();
  const { updatePreferences, isUpdatingPreferences } = useProfile();
  const [prefMsg, setPrefMsg] = useState('');

  const { register, handleSubmit, reset, watch } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      timezone: 'UTC',
      theme: 'system',
      date_format: 'Y-m-d',
    }
  });

  const currentTheme = watch('theme');

  const timezones = useMemo<string[]>(() => {
    try { 
      return (Intl as any).supportedValuesOf('timezone'); 
    } catch { 
      return ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tehran', 'Asia/Tokyo']; 
    }
  }, []);

  // Sync React Query data to form ONLY when the async user data arrives
  useEffect(() => {
    if (user?.settings) {
      reset({
        timezone: user.settings.timezone,
        theme: user.settings.theme,
        date_format: user.settings.date_format as PreferencesFormData['date_format'],
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: PreferencesFormData) => {
    setPrefMsg('');
    try {
      await updatePreferences(data);
      setPrefMsg('Preferences updated successfully!');
    } catch (err) {
      setPrefMsg('Failed to update preferences.');
    }
  };

  return (
    <form className="settings-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="settings-form__group">
        <label className="settings-form__label">Timezone</label>
        <select className="settings-form__input" {...register('timezone')}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
      
      <div className="settings-form__group">
        <label className="settings-form__label">Theme</label>
        <div className="settings-form__radio-group">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <label key={t} className={`settings-form__radio-label ${currentTheme === t ? 'settings-form__radio-label--active' : ''}`}>
              <input 
                type="radio" 
                value={t} 
                {...register('theme')} 
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
        <select className="settings-form__input" {...register('date_format')}>
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