import React, { useState } from 'react';
import ProfileForm from '@/components/user/profile/ProfileForm';
import PreferencesForm from '@/components/user/profile/PreferencesForm';

type TabType = 'profile' | 'preferences';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  return (
    <div className="settings-page">
      <div className="settings-page__container">
        <div className="settings-page__header">
          <h1 className="settings-page__title">Settings</h1>
          <p className="settings-page__subtitle">Manage your account settings and set e-mail preferences.</p>
        </div>

        <div className="settings-page__content glass-panel">
          {/* Tabs Navigation */}
          <div className="settings-page__tabs">
            <button 
              className={`settings-page__tab ${activeTab === 'profile' ? 'settings-page__tab--active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <i className="fas fa-user"></i> Profile
            </button>
            <button 
              className={`settings-page__tab ${activeTab === 'preferences' ? 'settings-page__tab--active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              <i className="fas fa-sliders-h"></i> Preferences
            </button>
          </div>

          {/* Tab Content (Delegated to SRP Components) */}
          {activeTab === 'profile' && <ProfileForm />}
          {activeTab === 'preferences' && <PreferencesForm />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;