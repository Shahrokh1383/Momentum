/* assets/js/app.js */

/**
 * ThemeManager: Handles Light/Dark mode switching with localStorage persistence.
 * Pure UI/UX logic, no backend interaction.
 */
const ThemeManager = {
  init() {
    const savedTheme = localStorage.getItem('momentum-theme') || 'dark';
    this.setTheme(savedTheme);
    
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('momentum-theme', theme);
    this.updateIcon(theme);
  },

  toggle() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  },

  updateIcon(theme) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    
    const icon = toggleBtn.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fas fa-sun';
      toggleBtn.setAttribute('aria-label', 'Switch to Light Mode');
    } else {
      icon.className = 'fas fa-moon';
      toggleBtn.setAttribute('aria-label', 'Switch to Dark Mode');
    }
  }
};

// Initialize global UI utilities when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
});