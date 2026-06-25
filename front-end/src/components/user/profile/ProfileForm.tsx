import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/context/authStore';
import AvatarModal from './AvatarModal';
import { profileSchema, ProfileFormData } from '@/validation/profileSchema';

const ProfileForm: React.FC = () => {
  const { user } = useCurrentUser();
  const { 
    updateProfile, isUpdatingProfile,
    uploadAvatar, isUploadingAvatar,
    deleteAvatar, isDeletingAvatar
  } = useProfile();
  
  const { avatarVersion } = useAuthStore();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      bio: '',
      profile_visibility: 'public',
    }
  });

  // Sync React Query data to form ONLY when the async user data arrives
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        bio: user.bio || '',
        profile_visibility: user.profile_visibility,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setProfileMsg('');
    try {
      // Convert empty string bio to null if backend expects null
      const payload = { ...data, bio: data.bio || null };
      await updateProfile(payload);
      setProfileMsg('Profile updated successfully!');
    } catch (err) {
      setProfileMsg('Failed to update profile.');
    }
  };

  const avatarUrl = `/api/user/profile/avatar?v=${avatarVersion}`;

  return (
    <>
      <form className="settings-form" onSubmit={handleSubmit(onSubmit)}>
        {/* Avatar Widget */}
        <div className="avatar-widget" onClick={() => setIsAvatarModalOpen(true)} role="button" tabIndex={0}>
          <img src={avatarUrl} alt="User Avatar" className="avatar-widget__image" />
          <div className="avatar-widget__overlay">
            <i className="fas fa-camera"></i>
            <span>Change Photo</span>
          </div>
        </div>

        <div className="settings-form__group">
          <label className="settings-form__label">Full Name</label>
          <input type="text" className={`settings-form__input ${errors.name ? 'is-invalid' : ''}`} {...register('name')} />
          {errors.name && <span className="text-danger" style={{ fontSize: '0.875rem' }}>{errors.name.message}</span>}
        </div>

        <div className="settings-form__group">
          <label className="settings-form__label">Bio</label>
          <textarea className={`settings-form__input settings-form__textarea ${errors.bio ? 'is-invalid' : ''}`} rows={3} placeholder="Tell us about yourself..." {...register('bio')} />
          {errors.bio && <span className="text-danger" style={{ fontSize: '0.875rem' }}>{errors.bio.message}</span>}
        </div>

        <div className="settings-form__group">
          <label className="settings-form__label">Profile Visibility</label>
          <select className="settings-form__input" {...register('profile_visibility')}>
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