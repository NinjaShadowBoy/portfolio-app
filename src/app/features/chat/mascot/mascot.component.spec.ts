import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatUiService } from '../../../core/services/chat-ui.service';
import { MascotComponent } from './mascot.component';
import { createJelly, jellyPath } from './mascot.jelly';

describe('MascotComponent', () => {
  const originalMatchMedia = window.matchMedia;
  const originalRaf = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  const inner = { width: 1024, height: 768 };
  const SIZE = 80;

  let fixture: ComponentFixture<MascotComponent>;
  let host: HTMLElement;
  let chatUi: ChatUiService;
  /** A hand-cranked rAF: frames run only when a test asks. */
  let queue: Map<number, FrameRequestCallback>;
  let nextId: number;
  let clock: number;

  beforeEach(() => {
    localStorage.clear();
    queue = new Map();
    nextId = 1;
    clock = 0;
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      const id = nextId++;
      queue.set(id, cb);
      return id;
    };
    window.cancelAnimationFrame = (id: number) => void queue.delete(id);
    // The mascot asks GET /chat/config on setup; keep it off the network.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ enabled: true, remainingToday: 10 }), { status: 200 })),
    );
    chatUi = TestBed.inject(ChatUiService);
  });

  afterEach(() => {
    if (fixture && !fixture.componentRef.hostView.destroyed) fixture.destroy();
    localStorage.clear();
    vi.unstubAllGlobals();
    window.matchMedia = originalMatchMedia!;
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancel;
    vi.restoreAllMocks();
  });

  /** Overrides the global stub from src/testing/setup.ts for one test. */
  function matchMedia(reduced = false, coarse = false): void {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduced : coarse,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  async function create(): Promise<void> {
    chatUi.setAvailable(true);
    fixture = TestBed.createComponent(MascotComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function frames(count: number): void {
    for (let i = 0; i < count; i++) {
      clock += 1000 / 60;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) cb(clock);
    }
  }

  function button(): HTMLButtonElement {
    return host.querySelector('button') as HTMLButtonElement;
  }

  /** How far the rig sits below its standing spot, in view box units. */
  function sunk(): number {
    const transform = host.querySelector('.rig')?.getAttribute('transform') ?? '';
    return Number(/translate\(0 (-?[\d.]+)\)/.exec(transform)?.[1]);
  }

  function pointer(type: string, target: EventTarget, x: number, y: number): void {
    target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0 }));
  }

  it('renders the launcher with the localized label and aria wiring', async () => {
    await create();

    expect(button().getAttribute('aria-label')).toBe('Open the Ninjassistant');
    expect(button().getAttribute('aria-controls')).toBe('chat-pane');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().getAttribute('type')).toBe('button');
    expect(button().querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('keeps aria-expanded in step with ChatUiService and toggles it on click', async () => {
    await create();

    button().click();
    expect(chatUi.open()).toBe(true);
    fixture.detectChanges();
    expect(button().getAttribute('aria-expanded')).toBe('true');

    chatUi.closePane();
    fixture.detectChanges();
    expect(button().getAttribute('aria-expanded')).toBe('false');
  });

  it('lives in the bottom-right corner, shy: it rises only to its head', async () => {
    await create();

    expect(host.style.getPropertyValue('--mascot-x')).toBe(`${inner.width - SIZE}px`);
    expect(host.style.getPropertyValue('--mascot-y')).toBe(`${inner.height - SIZE}px`);
    expect(host.style.getPropertyValue('--mascot-rot')).toBe('0deg'); // standing on the floor
    expect(sunk()).toBe(64); // starts under the edge
    frames(90);
    expect(sunk()).toBeGreaterThan(40); // lurking: head and headband only
    expect(sunk()).toBeLessThan(64);
  });

  it('comes out to help when the pointer comes close', async () => {
    await create();
    frames(30);

    pointer('pointermove', document, inner.width - SIZE / 2, inner.height - SIZE / 2 - 60);
    frames(90);

    expect(sunk()).toBeLessThan(2);
  });

  it('jiggles: a click dents the jelly body', async () => {
    await create();
    pointer('pointermove', document, inner.width - 40, inner.height - 40);
    frames(120);
    const rest = jellyPath(createJelly());

    button().click();
    frames(3);

    expect(host.querySelector('.body')?.getAttribute('d')).not.toBe(rest);
  });

  it('follows a moving pointer with its eyes, then looks around once it rests', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // idle glance: straight at the visitor
    try {
      await create();
      frames(10);

      pointer('pointermove', document, 40, inner.height - SIZE / 2); // far left, level
      frames(40);
      expect(Number(host.style.getPropertyValue('--pupil-x'))).toBeLessThan(-2); // on the floor, looking left

      clock += 2000; // the pointer rests
      vi.advanceTimersByTime(400);
      frames(60);
      expect(Math.hypot(Number(host.style.getPropertyValue('--pupil-x')), Number(host.style.getPropertyValue('--pupil-y')))).toBeLessThan(0.5); // back to the visitor
    } finally {
      vi.useRealTimers();
    }
  });

  it('performs the ninja move the chat asks for: a backflip spins the body', async () => {
    await create();
    frames(30);

    chatUi.requestMove('flip');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 450)); // the crouch before the jump
    frames(8);

    expect(host.querySelector('.rig')?.getAttribute('transform')).toContain('rotate(');
    frames(60); // airborne about 0.5 s, then lands
    expect(host.querySelector('.rig')?.getAttribute('transform')).not.toContain('rotate(');
  });

  it('stands fully out and never deforms under reduced motion', async () => {
    matchMedia(true);
    await create();

    expect(sunk()).toBe(0);
    pointer('pointermove', document, 500, 500);
    button().click();
    frames(30);

    expect(sunk()).toBe(0);
    expect(host.querySelector('.body')?.getAttribute('d')).toBe(jellyPath(createJelly()));
  });

  it('stands fully out with the mascot set to still', async () => {
    chatUi.setMascotMode('still');
    await create();
    frames(30);

    expect(sunk()).toBe(0);
  });

  it('can be thrown: it flies, falls and lands on an edge, and the drop opens nothing', async () => {
    await create();
    const start = { x: inner.width - SIZE / 2, y: inner.height - SIZE / 2 };

    pointer('pointerdown', button(), start.x, start.y);
    for (let i = 1; i <= 10; i++) pointer('pointermove', button(), start.x - i * 40, start.y - i * 40);
    frames(1);
    expect(Number.parseFloat(host.style.getPropertyValue('--mascot-x'))).toBeLessThan(inner.width - SIZE - 300);

    pointer('pointerup', button(), start.x - 400, start.y - 400);
    button().click();
    expect(chatUi.open()).toBe(false);

    frames(240);
    const x = Number.parseFloat(host.style.getPropertyValue('--mascot-x'));
    const y = Number.parseFloat(host.style.getPropertyValue('--mascot-y'));
    const onEdge = y === inner.height - SIZE || x === 0 || x === inner.width - SIZE;
    expect(onEdge).toBe(true);
  });

  it('adds no listeners on the server platform', async () => {
    // beforeEach already instantiated the default module through TestBed.inject.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    chatUi = TestBed.inject(ChatUiService);
    const addDocListener = vi.spyOn(document, 'addEventListener');
    const addWindowListener = vi.spyOn(window, 'addEventListener');
    await create();

    for (const listener of [addDocListener, addWindowListener]) {
      const types = listener.mock.calls.map(([type]) => type);
      expect(types).not.toContain('pointermove');
      expect(types).not.toContain('visibilitychange');
      expect(types).not.toContain('resize');
    }
  });

  it('removes its listeners and cancels rAF on destroy', async () => {
    await create();
    const removeDocListener = vi.spyOn(document, 'removeEventListener');
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    pointer('pointermove', document, 500, 500);
    const scheduled = [...queue.keys()].at(-1);
    expect(scheduled).toBeDefined();

    fixture.destroy();

    expect(removeDocListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeDocListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(cancelSpy).toHaveBeenCalledWith(scheduled);
  });

  it('swaps the animated mascot for a plain round launcher in hidden mode', async () => {
    chatUi.setMascotMode('hidden');
    await create();

    const plain = host.querySelector('.launch-plain');
    expect(plain).not.toBeNull();
    expect(host.querySelector('.mascot')).toBeNull();
    expect(plain!.getAttribute('aria-label')).toBe('Open the Ninjassistant');
    expect(plain!.getAttribute('aria-expanded')).toBe('false');
    expect(plain!.querySelector('svg')).not.toBeNull();

    chatUi.setMascotMode('animated');
    fixture.detectChanges();
    expect(host.querySelector('.mascot')).not.toBeNull();
  });

  it('glides out to dock left of the open pane', async () => {
    await create();
    document.documentElement.style.setProperty('--chat-pane-width', '400px');
    chatUi.openPane();
    fixture.detectChanges();
    frames(180);

    expect(host.style.getPropertyValue('--mascot-x')).toBe(`${inner.width - 400 - SIZE}px`);
    expect(host.style.getPropertyValue('--mascot-y')).toBe(`${inner.height - SIZE}px`);
    expect(sunk()).toBeLessThan(1);
    document.documentElement.style.removeProperty('--chat-pane-width');
  });
});
