import React from 'react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullScreen = true, message }) => {
  const containerClass = fullScreen 
    ? 'd-flex justify-content-center align-items-center vh-100' 
    : 'd-flex justify-content-center align-items-center py-4';

  return (
    <div className={containerClass}>
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        {message && <p className="text-muted-custom">{message}</p>}
      </div>
    </div>
  );
};

export default LoadingSpinner;