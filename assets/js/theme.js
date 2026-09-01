/**
 * TRAVELRAYZ — Dark / light theme (shared public + admin)
 */
const ThemeUI = {
  KEY: 'travelrayz-theme',
  LOGO_DARK: 'logo-full.png',
  LOGO_LIGHT: 'logo-full-light.png',

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  },

  logoBasePath(img) {
    const src = img.getAttribute('src') || '';
    return src.includes('../assets/') ? '../assets/images/' : 'assets/images/';
  },

  shouldUseLightLogo() {
    return this.getCurrentTheme() === 'light';
  },

  syncLogos() {
    document.querySelectorAll('.logo-img, .login-logo').forEach((img) => {
      const file = this.shouldUseLightLogo() ? this.LOGO_LIGHT : this.LOGO_DARK;
      const next = `${this.logoBasePath(img)}${file}`;
      if (img.getAttribute('src') !== next) img.setAttribute('src', next);
    });
  },

  applyTheme(theme) {
    const validTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', validTheme);
    try {
      localStorage.setItem(this.KEY, validTheme);
    } catch (_) {}
    this.syncToggles();
    this.syncLogos();
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
    this.syncLogos();

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
