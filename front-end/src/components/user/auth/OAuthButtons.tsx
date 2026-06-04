import { authService } from '@/services/user/authService';

const OAuthButtons = () => {
  const handleOAuth = async (provider: 'google' | 'github') => {
    try {
      const url = await authService.getOAuthRedirect(provider);
      // Open popup
      const width = 600, height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      window.open(url, 'OAuth', `width=${width},height=${height},top=${top},left=${left}`);
    } catch (error) {
      console.error('OAuth redirect failed', error);
    }
  };

  return (
    <>
      <div className="oauth-divider">
        <span>Or continue with</span>
      </div>
      <button type="button" className="btn-oauth" onClick={() => handleOAuth('google')}>
        <i className="fab fa-google"></i> Google
      </button>
      <button type="button" className="btn-oauth" onClick={() => handleOAuth('github')}>
        <i className="fab fa-github"></i> GitHub
      </button>
    </>
  );
};

export default OAuthButtons;