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

// jsdom has <dialog> but not its modal API. These stubs only toggle `open` and
// fire `close`; there is no top layer, focus trap or Escape handling, so a test
// that needs Escape dispatches a `cancel` event itself.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.show = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
    if (!this.open) return;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom has no object URLs. Each call returns a distinct fake blob: URL, so a
// test can spy on revokeObjectURL and check which previews were released.
if (!URL.createObjectURL) {
  let next = 0;
  URL.createObjectURL = () => `blob:test/${++next}`;
  URL.revokeObjectURL = () => undefined;
}

// jsdom has no Web Animations API. The mascot uses element.animate() for its
// hops and ducking; the stub records calls (tests can spy on it) and returns a
// minimal Animation whose cancel() is a no-op.
if (!Element.prototype.animate) {
  Element.prototype.animate = function (
    this: Element,
    keyframes: Keyframe[],
    options?: number | KeyframeAnimationOptions,
  ): Animation {
    void keyframes;
    void options;
    return { cancel: () => undefined, finished: Promise.resolve()} as unknown as Animation;
  };
}
