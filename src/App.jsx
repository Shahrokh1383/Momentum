import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HabitList from './components/HabitList';
import HabitForm from './components/HabitForm';
import HabitLogPage from './components/HabitLogPage';

// Welcome page component
const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center">
      <div className="card p-5 shadow-lg" style={{ maxWidth: '600px' }}>
        <div className="mb-4">
          <img
            src="/logo.jpg"
            alt="Momentum Logo"
            className="img-fluid rounded-circle border border-success border-3 shadow"
            style={{ width: '120px', height: '120px', objectFit: 'cover' }}
          />
        </div>
        <h2 className="text-white mb-3">Welcome to Momentum</h2>
        <p className="text-light">
          Track your habits, analyze your progress, and build unstoppable momentum.
        </p>
        <button className="btn btn-success mt-3 mx-auto d-block btn-pulse" onClick={() => navigate('/habits')}>
          Get Started
        </button>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <main className="flex-grow-1 container py-4">
          <Routes>
            <Route path="/" element={
              <div className="d-flex align-items-center justify-content-center">
                <WelcomePage />
              </div>
            } />
            <Route path="/habits" element={<HabitList />} />
            <Route path="/add" element={<HabitForm />} />
            <Route path="/edit/:id" element={<HabitForm />} />
            <Route path="/log/:id" element={<HabitLogPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;