/**
 * TRAVELRAYZ — Full-page loader (reference demo parity)
 * Dismiss ~900ms · fade 550ms · fallback 2500ms · scroll lock while active
 */
const PageLoader = {
  DISMISS_MS: 900,
  FADE_MS: 550,
  FALLBACK_MS: 2500,

  init() {
    const loader = document.getElementById('page-loader');
    if (!loader || loader.dataset.armed === '1') return;
    loader.dataset.armed = '1';

    document.documentElement.classList.add('is-loading');

    let finished = false;
    const dismiss = () => {
      if (finished || !loader.isConnected || loader.dataset.done === '1') return;
      finished = true;
      loader.dataset.done = '1';
      loader.classList.add('is-done');
      document.documentElement.classList.remove('is-loading');
      document.documentElement.classList.add('is-loaded');
      window.setTimeout(() => {
        if (loader.isConnected) loader.remove();
      }, this.FADE_MS);
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduce ? 150 : this.DISMISS_MS;
    window.setTimeout(dismiss, delay);
    window.setTimeout(dismiss, this.FALLBACK_MS);
  }
};

PageLoader.init();
