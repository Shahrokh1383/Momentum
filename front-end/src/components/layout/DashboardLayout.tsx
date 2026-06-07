import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';

const DashboardLayout: React.FC = () => {
  return (
    <div className="dashboard-layout">
      <AppHeader />
      <main className="dashboard-layout__main">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;