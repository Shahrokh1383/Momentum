import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/user/useAuth';
import { useProfile } from '@/hooks/user/useProfile';
import { useAuthStore } from '@/context/user/authStore';
import AvatarModal from './AvatarModal';

const ProfileForm: React.FC = () => {
  const { user } = useAuth();
  const { 
    updateProfile, isUpdatingProfile,
    uploadAvatar, isUploadingAvatar,
    deleteAvatar, isDeletingAvatar
  } = useProfile();
  
  const { avatarVersion } = useAuthStore();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || ''); 
  const [visibility, setVisibility] = useState(user?.profile_visibility || 'public');
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio || '');
      setVisibility(user.profile_visibility);
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

  const avatarUrl = `/api/user/profile/avatar?v=${avatarVersion}`;

  return (
    <>
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

      <AvatarModal 
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onUpload={uploadAvatar}
        onDelete={deleteAvatar}
        isUploading={isUploadingAvatar}
        isDeleting={isDeletingAvatar}
      />
    </>
  );
};

export default ProfileForm;