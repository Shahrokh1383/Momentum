import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '@/styles/ui/icon-picker.css';

const ICON_LIST = [
  'fa-solid fa-folder', 'fa-solid fa-tag', 'fa-solid fa-bookmark', 'fa-solid fa-star',
  'fa-solid fa-heart', 'fa-solid fa-briefcase', 'fa-solid fa-graduation-cap', 'fa-solid fa-cart-shopping',
  'fa-solid fa-home', 'fa-solid fa-car', 'fa-solid fa-plane', 'fa-solid fa-utensils',
  'fa-solid fa-dumbbell', 'fa-solid fa-heart-pulse', 'fa-solid fa-stethoscope', 'fa-solid fa-pills',
  'fa-solid fa-gamepad', 'fa-solid fa-film', 'fa-solid fa-music', 'fa-solid fa-camera',
  'fa-solid fa-code', 'fa-solid fa-laptop-code', 'fa-solid fa-database', 'fa-solid fa-server',
  'fa-solid fa-palette', 'fa-solid fa-pen-fancy', 'fa-solid fa-paintbrush', 'fa-solid fa-pen-ruler',
  'fa-solid fa-money-bill-wave', 'fa-solid fa-wallet', 'fa-solid fa-piggy-bank', 'fa-solid fa-credit-card',
  'fa-solid fa-bolt', 'fa-solid fa-lightbulb', 'fa-solid fa-wand-magic-sparkles', 'fa-solid fa-rocket',
  'fa-solid fa-users', 'fa-solid fa-user-group', 'fa-solid fa-user-tie', 'fa-solid fa-baby',
  'fa-solid fa-dog', 'fa-solid fa-cat', 'fa-solid fa-fish', 'fa-solid fa-dove',
  'fa-solid fa-shirt', 'fa-solid fa-gem', 'fa-solid fa-gift', 'fa-solid fa-box-open',
  'fa-solid fa-truck-fast', 'fa-solid fa-building', 'fa-solid fa-landmark', 'fa-solid fa-store',
  'fa-solid fa-tree', 'fa-solid fa-leaf', 'fa-solid fa-seedling', 'fa-solid fa-mountain-sun',
  'fa-solid fa-sun', 'fa-solid fa-cloud-sun', 'fa-solid fa-umbrella-beach', 'fa-solid fa-snowflake',
  'fa-solid fa-phone', 'fa-solid fa-envelope', 'fa-solid fa-comment-dots', 'fa-solid fa-bell',
  'fa-solid fa-shield-halved', 'fa-solid fa-lock', 'fa-solid fa-key', 'fa-solid fa-gear',
  'fa-solid fa-chart-line', 'fa-solid fa-chart-pie', 'fa-solid fa-calendar-days', 'fa-solid fa-clock',
  'fa-solid fa-map-location-dot', 'fa-solid fa-location-dot', 'fa-solid fa-globe', 'fa-solid fa-earth-americas',
  'fa-solid fa-trophy', 'fa-solid fa-medal', 'fa-solid fa-flag', 'fa-solid fa-bullseye',
  'fa-solid fa-flask', 'fa-solid fa-microscope', 'fa-solid fa-atom', 'fa-solid fa-dna',
  'fa-solid fa-bicycle', 'fa-solid fa-basketball', 'fa-solid fa-football', 'fa-solid fa-chess',
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const openPicker = () => {
    setSearch('');
    setIsOpen(true);
  };

  const closePicker = () => {
    setIsOpen(false);
  };

  const handleSelect = (icon: string) => {
    onChange(icon);
    closePicker();
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePicker();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when picker is open (same pattern as Modal.tsx)
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isOpen]);

  const filteredIcons = ICON_LIST.filter(icon => 
    icon.replace('fa-solid fa-', '').includes(search.toLowerCase())
  );

  return (
    <>
      {/* Trigger Input */}
      <div 
        className="icon-picker__trigger settings-form__input d-flex align-items-center gap-2" 
        onClick={openPicker}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && openPicker()}
      >
        <i className={value || 'fa-solid fa-folder'} style={{ fontSize: '1.1rem' }}></i>
        <span className="icon-picker__trigger-text">
          {value ? value.replace('fa-solid fa-', '').replace(/-/g, ' ') : 'Select an icon...'}
        </span>
      </div>

      {/* Centered Overlay Picker */}
      {isOpen && createPortal(
        <div 
          className="icon-picker__overlay"
          onClick={closePicker} // Clicking dark backdrop closes it
        >
          <div 
            className="icon-picker__panel"
            onClick={(e) => e.stopPropagation()} // Clicking inside panel does NOT close it
          >
            {/* Panel Header */}
            <div className="icon-picker__panel-header">
              <h4 className="icon-picker__panel-title">Choose Icon</h4>
              <button 
                className="icon-picker__close-btn" 
                onClick={closePicker}
                aria-label="Close icon picker"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="icon-picker__search">
              <i className="fas fa-search"></i>
              <input 
                type="text" 
                placeholder="Search icons..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Scrollable Grid */}
            <div className="icon-picker__grid">
              {filteredIcons.length > 0 ? (
                filteredIcons.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`icon-picker__item ${value === icon ? 'icon-picker__item--active' : ''}`}
                    onClick={() => handleSelect(icon)}
                    title={icon.replace('fa-solid fa-', '').replace(/-/g, ' ')}
                  >
                    <i className={icon}></i>
                  </button>
                ))
              ) : (
                <div className="icon-picker__empty">No icons found</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default IconPicker;