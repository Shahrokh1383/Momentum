import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/user/useAuth';
import { useProfile } from '@/hooks/user/useProfile';
import { UserSettings } from '@/types/user';
import { useAuthStore } from '@/context/user/authStore';
import AvatarModal from '@/components/user/profile/AvatarModal';

type TabType = 'profile' | 'preferences';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    updateProfile, isUpdatingProfile, 
    updatePreferences, isUpdatingPreferences,
    uploadAvatar, isUploadingAvatar,
    deleteAvatar, isDeletingAvatar
  } = useProfile();
  
  const { avatarVersion } = useAuthStore();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  
  // ... (Keep all your existing state variables: name, bio, visibility, timezone, theme, dateFormat, profileMsg, prefMsg, timezones, and useEffects exactly as they were)
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || ''); 
  const [visibility, setVisibility] = useState(user?.profile_visibility || 'public');
  const [timezone, setTimezone] = useState(user?.settings?.timezone || 'UTC');
  const [theme, setTheme] = useState<UserSettings['theme']>(user?.settings?.theme || 'system');
  const [dateFormat, setDateFormat] = useState(user?.settings?.date_format || 'Y-m-d');
  const [profileMsg, setProfileMsg] = useState('');
  const [prefMsg, setPrefMsg] = useState('');

  const timezones = useMemo<string[]>(() => {
    try { return (Intl as any).supportedValuesOf('timezone'); } 
    catch { return ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tehran', 'Asia/Tokyo']; }
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio || '');
      setVisibility(user.profile_visibility);
      if (user.settings) {
        setTimezone(user.settings.timezone);
        setTheme(user.settings.theme);
        setDateFormat(user.settings.date_format);
      }
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      await updateProfile({ name, bio, profile_visibility: visibility });
      setProfileMsg('Profile updated successfully!');
    } catch (err) {
      setProfileMsg('Failed to update profile.');
    }
  };

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

  const avatarUrl = `/api/user/profile/avatar?v=${avatarVersion}`;

  return (
    <div className="settings-page">
      <div className="settings-page__container">
        <div className="settings-page__header">
          <h1 className="settings-page__title">Settings</h1>
          <p className="settings-page__subtitle">Manage your account settings and set e-mail preferences.</p>
        </div>

        <div className="settings-page__content glass-panel">
          {/* Tabs */}
          <div className="settings-page__tabs">
            <button className={`settings-page__tab ${activeTab === 'profile' ? 'settings-page__tab--active' : ''}`} onClick={() => setActiveTab('profile')}>
              <i className="fas fa-user"></i> Profile
            </button>
            <button className={`settings-page__tab ${activeTab === 'preferences' ? 'settings-page__tab--active' : ''}`} onClick={() => setActiveTab('preferences')}>
              <i className="fas fa-sliders-h"></i> Preferences
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form className="settings-form" onSubmit={handleProfileSubmit}>
              
              {/* Avatar Widget */}
              <div className="avatar-widget" onClick={() => setIsAvatarModalOpen(true)}>
                <img src={avatarUrl} alt="User Avatar" className="avatar-widget__image" />
                <div className="avatar-widget__overlay">
                  <i className="fas fa-camera"></i>
                  <span>Change Photo</span>
                </div>
              </div>

              <div className="settings-form__group">
                <label className="settings-form__label">Full Name</label>
                <input type="text" className="settings-form__input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="settings-form__group">
                <label className="settings-form__label">Bio</label>
                <textarea className="settings-form__input settings-form__textarea" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." />
              </div>

              <div className="settings-form__group">
                <label className="settings-form__label">Profile Visibility</label>
                <select className="settings-form__input" value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
                  <option value="public">Public</option>
                  <option value="friends_only">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              </div>

              {profileMsg && <p className="settings-form__message settings-form__message--success">{profileMsg}</p>}

              <button type="submit" className="settings-form__btn" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          )}

          {/* Preferences Tab (Keep exactly as it was) */}
          {activeTab === 'preferences' && (
            <form className="settings-form" onSubmit={handlePreferencesSubmit}>
              <div className="settings-form__group">
                <label className="settings-form__label">Timezone</label>
                <select className="settings-form__input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {timezones.map((tz) => (<option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>))}
                </select>
              </div>
              <div className="settings-form__group">
                <label className="settings-form__label">Theme</label>
                <div className="settings-form__radio-group">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <label key={t} className={`settings-form__radio-label ${theme === t ? 'settings-form__radio-label--active' : ''}`}>
                      <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => setTheme(t)} className="settings-form__radio-input" />
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
          )}
        </div>
      </div>

      <AvatarModal 
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onUpload={uploadAvatar}
        onDelete={deleteAvatar}
        isUploading={isUploadingAvatar}
        isDeleting={isDeletingAvatar}
      />
    </div>
  );
};

export default SettingsPage;