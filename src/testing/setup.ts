// jsdom has no matchMedia. ThemeService reads it on construction, so every test
// that touches the app shell needs it. Reports "no match" (light, no motion
// preference) unless a test overrides window.matchMedia.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}
