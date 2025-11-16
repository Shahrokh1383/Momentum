import React from 'react';

const Footer = () => {
  return (
    <footer className="py-4 mt-auto text-center">
      <div className="container">
        <p className="text-light mb-0">© {new Date().getFullYear()} Momentum - All Rights Reserved</p>
      </div>
    </footer>
  );
};

export default Footer;