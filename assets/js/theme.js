/**
 * TRAVELRAYZ — Dark / light theme (shared public + admin)
 */
const ThemeUI = {
  KEY: 'travelrayz-theme',

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  },

  applyTheme(theme) {
    const validTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', validTheme);
    try {
      localStorage.setItem(this.KEY, validTheme);
    } catch (_) {}
    this.syncToggles();
  },

  syncToggles() {
    const isLight = this.getCurrentTheme() === 'light';
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.setAttribute(
        'aria-label',
        isLight ? 'Switch to dark theme' : 'Switch to light theme'
      );
      button.setAttribute('title', isLight ? 'Dark theme' : 'Light theme');
      button.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    });
  },

  enableTransitions() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.add('theme-transitions');
      });
    });
  },

  init() {
    this.syncToggles();

    document.addEventListener('click', (event) => {
      const button = event.target.closest('.theme-toggle');
      if (!button) return;
      event.preventDefault();
      const nextTheme = this.getCurrentTheme() === 'dark' ? 'light' : 'dark';
      this.applyTheme(nextTheme);
    });

    this.enableTransitions();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeUI.init());
} else {
  ThemeUI.init();
}
