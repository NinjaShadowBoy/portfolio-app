import { EnvironmentProviders, PLATFORM_ID, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ChatUiService, MASCOT_MODE_KEY } from './chat-ui.service';

describe('ChatUiService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  function makeService(providers: (Provider | EnvironmentProviders)[] = []): ChatUiService {
    TestBed.resetTestingModule(); // also lets a test recreate the service to reload
    TestBed.configureTestingModule({ providers });
    const service = TestBed.inject(ChatUiService);
    TestBed.tick(); // flush effects
    return service;
  }

  describe('navigation while open', () => {
    function withScreen(fullScreen: boolean) {
      vi.spyOn(globalThis, 'matchMedia').mockReturnValue({ matches: fullScreen } as MediaQueryList);
      const service = makeService([provideRouter([{ path: '**', children: [] }])]);
      return { service, router: TestBed.inject(Router) };
    }

    it('closes the full-screen pane on a navigation, including to the current page', async () => {
      const { service, router } = withScreen(true);
      service.openPane();
      await router.navigateByUrl('/projects');
      expect(service.open()).toBe(false);

      service.openPane();
      await router.navigateByUrl('/projects');
      expect(service.open()).toBe(false);
    });

    it('keeps the side pane open on wide screens', async () => {
      const { service, router } = withScreen(false);
      service.openPane();
      await router.navigateByUrl('/projects');
      expect(service.open()).toBe(true);
    });
  });

  it('toggles the pane open state', () => {
    const service = makeService();

    expect(service.open()).toBe(false);
    service.toggle();
    expect(service.open()).toBe(true);
    service.toggle();
    expect(service.open()).toBe(false);
  });

  it('openPane and closePane set the state directly', () => {
    const service = makeService();

    service.openPane();
    expect(service.open()).toBe(true);
    service.toggle();
    expect(service.open()).toBe(false);
    service.closePane();
    expect(service.open()).toBe(false);
  });

  it('starts unavailable and follows setAvailable and setRemainingToday', () => {
    const service = makeService();

    expect(service.available()).toBe(false);
    service.setAvailable(true);
    expect(service.available()).toBe(true);

    service.setRemainingToday(4);
    expect(service.remainingToday()).toBe(4);
    service.setRemainingToday(null);
    expect(service.remainingToday()).toBeNull();
  });

  it('latches paneRequested on the first open', () => {
    const service = makeService();
    expect(service.paneRequested()).toBe(false);

    service.openPane();
    service.closePane();

    expect(service.paneRequested()).toBe(true);
  });

  it('persists the mascot mode and restores it on a reload', () => {
    const service = makeService();
    service.setMascotMode('still');
    expect(localStorage.getItem(MASCOT_MODE_KEY)).toBe('still');

    // A reload is a fresh injector reading the same storage.
    TestBed.resetTestingModule();
    const reloaded = makeService();
    expect(reloaded.mascotMode()).toBe('still');
  });

  it('ignores unknown stored modes', () => {
    localStorage.setItem(MASCOT_MODE_KEY, 'zoomies');
    expect(makeService().mascotMode()).toBe('animated');
  });

  it('stores the hidden mode', () => {
    const service = makeService();
    service.setMascotMode('hidden');

    expect(service.mascotMode()).toBe('hidden');
    expect(localStorage.getItem(MASCOT_MODE_KEY)).toBe('hidden');
  });

  it('is SSR-safe: the server neither reads nor writes storage', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    const service = makeService([{ provide: PLATFORM_ID, useValue: 'server' }]);
    service.setMascotMode('still');

    expect(service.mascotMode()).toBe('still');
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem(MASCOT_MODE_KEY)).toBeNull();
  });
});
