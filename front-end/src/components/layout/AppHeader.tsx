import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/user/useAuth';
import PremiumBadge from '@/components/user/subscription/PremiumBadge';
import InstallPWA from '@/components/user/pwa/InstallPWA';

const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="app-header">
      <div className="app-header__container">
        <Link to="/dashboard" className="app-header__logo">
          <img src="/assets/logo.jpg" alt="Momentum" className="app-header__logo-img" />
          <span className="app-header__logo-text">Momentum</span>
        </Link>

        <nav className="app-header__nav">
          <Link to="/dashboard" className="app-header__link">Dashboard</Link>
          <Link to="/plans" className="app-header__link">Plans</Link>
        </nav>

        <div className="app-header__actions">
          {isAuthenticated && user ? (
            <>
              <InstallPWA />
              <PremiumBadge planSlug={user.subscription?.plan} />
              <div className="app-header__user">
                <img 
                  src={user.avatar || '/assets/default-avatar.png'} 
                  alt={user.name} 
                  className="app-header__avatar"
                />
                <span className="app-header__username">{user.name}</span>
                <button className="app-header__logout" onClick={handleLogout} title="Logout">
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </div>
            </>
          ) : (
            <div className="app-header__auth">
              <InstallPWA />
              <Link to="/login" className="app-header__link">Sign In</Link>
              <Link to="/register" className="btn btn-sm btn-momentum">Get Started</Link>
            </div>
          )}
        </div>

        <button className="app-header__mobile-toggle" aria-label="Menu">
          <i className="fas fa-bars"></i>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;