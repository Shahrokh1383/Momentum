import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useLogout } from '@/hooks/auth/useAuthMutations';
import { useAuthStore } from '@/context/authStore';
import PremiumBadge from '@/components/user/billing/PremiumBadge';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'fa-house' },
  { to: '/plans', label: 'Plans', icon: 'fa-crown' },
  { to: '/settings', label: 'Settings', icon: 'fa-gear' },
  { to: '/categories', label: 'categories', icon: 'fa-layer-group' },
  { to: '/habits', label: 'habits', icon: 'fa-bullseye' },
];

const AppHeader: React.FC = () => {
  const { user, isAuthenticated } = useCurrentUser();
  const { logout } = useLogout();
  const { avatarVersion } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);

  useEffect(() => { closeDrawer(); }, [location.pathname, closeDrawer]);
  useEffect(() => {
    document.body.classList.toggle('no-scroll', isDrawerOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [isDrawerOpen]);
  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawerOpen, closeDrawer]);

  const handleLogout = async () => { closeDrawer(); await logout(); };
  const avatarSrc = useMemo(() => `/api/user/profile/avatar?v=${avatarVersion}`, [avatarVersion]);

  return (
    <>
      <header className="app-header">
        <div className="app-header__container">
          <Link to="/dashboard" className="app-header__logo" aria-label="Momentum home">
            <img src="/assets/logo.jpg" alt="" className="app-header__logo-img" />
            <span className="app-header__logo-text">Momentum</span>
          </Link>
          <nav className="app-header__nav" aria-label="Main navigation">
            {NAV_LINKS.map((link) => <Link key={link.to} to={link.to} className="app-header__link">{link.label}</Link>)}
          </nav>
          <div className="app-header__actions">
            {isAuthenticated && user && (
              <>
                <PremiumBadge planSlug={user.active_plan} />
                <div className="app-header__user">
                  <img src={avatarSrc} alt={user?.name ?? ''} className="app-header__avatar" />
                  <span className="app-header__username">{user.name}</span>
                  <button className="app-header__logout" onClick={handleLogout} title="Logout" aria-label="Logout"><i className="fas fa-sign-out-alt" /></button>
                </div>
              </>
            )}
            <button className={`hamburger-btn ${isDrawerOpen ? 'hamburger-btn--open' : ''}`} onClick={toggleDrawer} aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'} aria-expanded={isDrawerOpen} aria-controls="mobile-drawer">
              <span className="hamburger-btn__lines"><span /><span /><span /></span>
            </button>
          </div>
        </div>
      </header>
      <div className={`mobile-drawer-backdrop ${isDrawerOpen ? 'mobile-drawer-backdrop--open' : ''}`} onClick={closeDrawer} aria-hidden="true" />
      <aside id="mobile-drawer" className={`mobile-drawer ${isDrawerOpen ? 'mobile-drawer--open' : ''}`} aria-hidden={!isDrawerOpen}>
        <div className="mobile-drawer__header">
          <div className="mobile-drawer__brand"><img src="/assets/logo.jpg" alt="" /><span>Momentum</span></div>
          <div className="mobile-drawer__header-actions">
            <button className="mobile-drawer__close" onClick={closeDrawer} aria-label="Close menu"><i className="fas fa-times" /></button>
          </div>
        </div>
        {isAuthenticated && user && (
          <div className="mobile-drawer__user-card">
            <img src={avatarSrc} alt={user?.name ?? ''} className="mobile-drawer__user-avatar" />
            <div className="mobile-drawer__user-info">
              <span className="mobile-drawer__user-name">{user.name}</span>
              <PremiumBadge planSlug={user.active_plan} />
            </div>
          </div>
        )}
        <nav className="mobile-drawer__nav" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (<Link key={link.to} to={link.to} className="mobile-drawer__link"><i className={`fas ${link.icon}`} /><span>{link.label}</span></Link>))}
        </nav>
        {isAuthenticated && (
          <div className="mobile-drawer__footer">
            <button className="mobile-drawer__logout" onClick={handleLogout}><i className="fas fa-sign-out-alt" /><span>Logout</span></button>
          </div>
        )}
      </aside>
    </>
  );
};
export default AppHeader;