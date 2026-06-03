/* assets/js/auth.js */

/**
 * PasswordVisibilityToggle: Manages the eye icon click to show/hide password.
 */
const PasswordVisibility = {
  init() {
    const toggleButtons = document.querySelectorAll('.password-toggle-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const icon = btn.querySelector('i');

        if (input.type === 'password') {
          input.type = 'text';
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        } else {
          input.type = 'password';
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
        
        // Keep focus on the input for better UX
        input.focus();
      });
    });
  }
};

/**
 * PasswordStrengthMeter: Pure UI evaluation of password complexity.
 */
const PasswordStrengthMeter = {
  init() {
    const passwordInput = document.getElementById('password');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    if (!passwordInput || !strengthBar || !strengthText) return;

    passwordInput.addEventListener('input', (e) => {
      const password = e.target.value;
      const result = this.evaluate(password);
      
      // Update UI
      strengthBar.style.width = `${(result.score / 5) * 100}%`;
      strengthBar.style.backgroundColor = result.color;
      strengthText.textContent = result.label;
      strengthText.style.color = result.color;
    });
  },

  evaluate(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { color: '#ef4444', label: 'Very Weak' },      // Red
      { color: '#f97316', label: 'Weak' },            // Orange
      { color: '#eab308', label: 'Fair' },            // Yellow
      { color: '#22c55e', label: 'Strong' },          // Green
      { color: '#38ef7d', label: 'Very Strong' }      // Brand Light Green
    ];

    return {
      score: score,
      color: levels[score - 1]?.color || '#ef4444',
      label: score === 0 && password.length === 0 ? 'Enter a password' : (levels[score - 1]?.label || 'Very Weak')
    };
  }
};

/**
 * FormInteraction: Handles mock submission states for UX demonstration.
 */
const FormInteraction = {
  init() {
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent actual submission for prototype
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalContent = submitBtn.innerHTML;
        
        // UX: Loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...';
        submitBtn.style.opacity = '0.8';

        // UX: Simulate network delay then reset (for prototype demonstration)
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalContent;
          submitBtn.style.opacity = '1';
          
          // In a real app, this is where routing would happen
          console.log('Form submitted successfully (Prototype Mode)');
        }, 1500);
      });
    });
  }
};

// Initialize all Auth UI modules
document.addEventListener('DOMContentLoaded', () => {
  PasswordVisibility.init();
  PasswordStrengthMeter.init();
  FormInteraction.init();
});