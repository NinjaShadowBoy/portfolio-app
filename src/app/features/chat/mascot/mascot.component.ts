import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChatUiService } from '../../../core/services/chat-ui.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  EdgePosition,
  HEADER_RESERVE,
  MascotEdge,
  Size,
  avoidToastCorner,
  edgeParam,
  edgePosition,
  nearestEdgeParam,
  pupilOffset,
  walkableLength,
} from './mascot.geometry';
import {
  BODY,
  Jelly,
  Vec,
  createJelly,
  featureTransform,
  jellyPath,
  jellySettled,
  poke,
  resetJelly,
  shove,
  stepJelly,
} from './mascot.jelly';
import {
  Brain,
  Gaze,
  LOOK_AT_POINTER_MS,
  NEAR_PX,
  REVEAL,
  arrived,
  circularDelta,
  decide,
  initialBrain,
  nextGaze,
} from './mascot.behavior';
import { MoveBody, NinjaMove, isNinjaMove, runNinjaMove } from './mascot.moves';

/** Rest heights (view box units) of the features that ride on the jelly. */
const EYES_Y = 73.5;
const BAND_Y = 55;
/** Units the body sinks at reveal 0: the whole body and headband are under the edge. */
const SINK_UNITS = 64;

/** Reveal spring: quick to pop out, softer to duck. */
const REVEAL_K_UP = 260;
const REVEAL_K_DOWN = 150;
const REVEAL_ZETA = 0.5;
/** Creeping speed along the edges, px/s. */
const CREEP_PX_S = 230;
/**
 * How strongly the jelly reacts to everything (landings, pokes, the box's
 * acceleration). 1 is the full effect; lower is firmer and calmer.
 */
const JELLY_STRENGTH = 0.35;
/** A happy hop out of the edge: take-off speed and gravity, px/s and px/s². */
const HOP_PX_S = 200;
const GRAVITY_PX_S2 = 2600;
/** Throwing: speed cap, air drag per second, and how much a wall bounce keeps. */
const THROW_MAX_PX_S = 2600;
const AIR_DRAG = 0.6;
const WALL_BOUNCE = 0.4;
/** Jelly reaction to landings and taps (units/s per px/s, and units/s). */
const LANDING_SHOVE = 0.16 * JELLY_STRENGTH;
const POKE_STRENGTH = 150 * JELLY_STRENGTH;
/** Pseudo-force smoothing and cap, so pointer jitter does not shake the jelly. */
const FORCE_SMOOTHING = 0.35;
const FORCE_MAX = 9000;
/** Docking glide spring, 1/s². */
const DOCK_K = 120;
const PUPIL_LERP = 0.18;
const PUPIL_MAX = 2.6;
const PUPIL_BOX_HALF = 14;
const TAIL_MAX_DEG = 45;
const DRAG_THRESHOLD = 6;
const VELOCITY_WINDOW_MS = 90;
const THINK_MS = 200;
const BLINK_MIN_MS = 3000;
const BLINK_SPAN_MS = 4000;
const BLINK_CLOSED_MS = 150;
const SCROLL_SLIDE_DELTA = 4;
const POSITION_KEY = 'mascot-position';

const EDGE_ANGLE: Record<MascotEdge, number> = { bottom: 0, right: -90, left: 90 };

/**
 * The chat mascot: a shy jelly ninja living in the screen edges. Its mood is
 * in mascot.behavior.ts and its body in mascot.jelly.ts. One rAF loop writes
 * styles and SVG attributes directly; nothing writes signals per frame.
 */
@Component({
  selector: 'app-mascot',
  templateUrl: './mascot.component.html',
  styleUrl: './mascot.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.slide-out]': 'slidAway()' },
})
export class MascotComponent {
  /** Desktop and touch box sizes; the CSS uses the same numbers. */
  private static readonly SIZE = { desktop: 80, mobile: 64 };

  protected readonly chatUi = inject(ChatUiService);
  protected readonly ui = inject(UiStateService);
  private readonly notifications = inject(NotificationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Marked with an explicit @@id so both locales translate it. */
  protected readonly label = $localize`:Chat mascot launcher button@@chatMascotOpen:Open the Ninjassistant`;

  /** True while reduced motion is on or the mascot was set to 'still'. */
  protected readonly still = signal(false);
  /** Mobile: parked out of view while the page scrolls down. */
  protected readonly slidAway = signal(false);
  protected readonly dragging = signal(false);

  private readonly rigEl = viewChild<ElementRef<SVGGElement>>('rig');
  private readonly bodyEl = viewChild<ElementRef<SVGPathElement>>('bodyPath');
  private readonly faceEl = viewChild<ElementRef<SVGGElement>>('face');
  private readonly bandEl = viewChild<ElementRef<SVGGElement>>('band');

  // --- World state --------------------------------------------------------
  private setupDone = false;
  private destroyed = false;
  private paused = false;
  private reducedMotion = false;
  private touch = false;
  private focused = false;
  private docked = false;
  private viewport: Size = { width: 1280, height: 800 };

  /** Where it stands on the perimeter (0..1, wraps) and its box's top-left corner. */
  private t = 0;
  private pos: Vec = { x: -200, y: -200 };
  private angle = 0;
  /** Screen velocity while flying, gliding or creeping, px/s. */
  private vel: Vec = { x: 0, y: 0 };
  private flying = false;
  private gliding = false;

  /** 0 under the edge .. 1 fully out, and its spring velocity. */
  private reveal = 0;
  private revealVel = 0;
  /** Hop height above the edge (px) and its velocity. */
  private lift = 0;
  private liftVel = 0;

  private readonly jelly: Jelly = createJelly();
  private brain: Brain = initialBrain(0);
  private wasOut = false;

  /** Recent positions, for the pseudo-force the jelly feels. */
  private prevPos: Vec[] = [];
  private prevRigY: number[] = [];
  private force: Vec = { x: 0, y: 0 };
  /** Frames to skip the force estimate after a jump (rotation, pick-up). */
  private settleFrames = 0;

  private pointer: Vec | null = null;
  private pointerMovedAt: number | null = null;
  private pupil: Vec = { x: 0, y: 0 };
  /** Where the eyes wander while the pointer is still. */
  private gaze: Gaze = { x: 0, y: 0, until: 0 };
  private wasFollowing = false;
  private tailAngle = 0;

  private grab: {
    id: number;
    offset: Vec;
    start: Vec;
    moved: boolean;
    samples: Array<{ x: number; y: number; at: number }>;
  } | null = null;
  private suppressClick = false;

  private nextBlinkAt = 0;
  private blinkTimer = 0;
  private lastScrollY = 0;
  private scrollScheduled = false;

  // --- Ninja moves (see mascot.moves.ts) -----------------------------------
  /** Bumped to cancel the running move. */
  private moveToken = 0;
  private moving = false;
  /** A move asked for while the full-screen chat hides the mascot. */
  private pendingMove: NinjaMove | null = null;
  private revealPin: number | null = null;
  /** Spin of the body around its centre (deg) and its rate while airborne. */
  private spin = 0;
  private spinVel = 0;
  private dashState: { target: number; speed: number; resolve: () => void } | null = null;
  private dashPhase = 0;
  /** Running legs: the body bobs this many px. */
  private bob = 0;
  private lookOverride: Vec | null = null;
  /** Lean of the body (deg), eased towards its target each frame. */
  private lean = 0;
  private leanTarget = 0;

  /** Last values written to the DOM, so unchanged ones are skipped. */
  private readonly writtenVars = new Map<string, string>();
  private readonly writtenAttrs = new WeakMap<Element, Map<string, string>>();
  private jellyDrawnAtRest = false;
  private paneWidthCache = 0;
  private paneWidthReadAt = -Infinity;

  private rafId = 0;
  private lastFrame = 0;
  private thinkTimer = 0;
  private cleanups: Array<() => void> = [];

  constructor() {
    afterNextRender(() => this.setup());
    this.destroyRef.onDestroy(() => this.teardown());

    effect(() => {
      const open = this.chatUi.open();
      if (this.setupDone) this.setDocked(open);
      else this.docked = open;
    });
    effect(() => {
      this.syncStillness(this.chatUi.mascotMode() === 'still');
    });
    effect(() => {
      const move = this.chatUi.move();
      if (move && isNinjaMove(move.name)) this.performMove(move.name);
    });
    effect(() => {
      // The header drawer covers the screen; hidden mode swaps in a plain button.
      const away = this.ui.drawerOpen() || this.chatUi.mascotMode() === 'hidden' || !this.chatUi.available();
      if (away) this.pause();
      else this.resume();
    });
  }

  // --- Lifecycle ----------------------------------------------------------

  private setup(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const view = this.view();
    if (!view) return;
    // Chat is hidden until this says it is on; never called on the server.
    void this.chatUi.loadConfig();
    this.setupDone = true;
    this.measure(view);
    this.reducedMotion = view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.touch = view.matchMedia?.('(hover: none), (pointer: coarse)').matches ?? false;
    this.still.set(this.reducedMotion || this.chatUi.mascotMode() === 'still');

    const motionQuery = view.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    if (motionQuery) {
      const onChange = (event: MediaQueryListEvent) => {
        this.reducedMotion = event.matches;
        this.syncStillness(this.chatUi.mascotMode() === 'still');
      };
      motionQuery.addEventListener?.('change', onChange);
      this.cleanups.push(() => motionQuery.removeEventListener?.('change', onChange));
    }

    this.listen(this.document, 'pointermove', this.onPointerMove);
    this.listen(this.document, 'visibilitychange', this.onVisibility);
    this.listen(view, 'resize', this.onResize);
    if (this.touch) this.listen(view, 'scroll', this.onScroll);

    const now = this.now();
    this.brain = initialBrain(now);
    // The corner itself starts the right wall; a hair before it stands on the floor.
    this.t = this.savedT() ?? Math.max(0, edgeParam('bottomRight', this.viewport, this.size()) - 1e-6);
    this.standOn(this.t);
    // Out at once when it must stay out; otherwise it rises from the edge.
    this.reveal = this.holdOut() ? 1 : 0;
    this.wasOut = this.reveal === 1;
    if (this.docked) this.setDocked(true);
    this.nextBlinkAt = now + BLINK_MIN_MS;
    this.render();
    if (!this.paused) {
      this.startThinking();
      this.wake();
    }
  }

  private listen<E extends Event>(target: Window | Document, type: string, handler: (event: E) => void): void {
    const passive = type === 'pointermove' || type === 'scroll';
    target.addEventListener(type, handler as EventListener, passive ? { passive: true } : undefined);
    this.cleanups.push(() => target.removeEventListener(type, handler as EventListener));
  }

  private teardown(): void {
    this.destroyed = true;
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.stopLoop();
    this.stopThinking();
    clearTimeout(this.blinkTimer);
  }

  private view(): Window | null {
    return this.document.defaultView;
  }

  private now(): number {
    return this.view()?.performance?.now() ?? Date.now();
  }

  // --- Template handlers --------------------------------------------------

  protected toggleChat(event?: MouseEvent): void {
    // The click that ends a drag drops the mascot; it does not open the chat.
    if (this.suppressClick) {
      this.suppressClick = false;
      event?.preventDefault();
      return;
    }
    this.pokeAt(event && event.detail > 0 ? { x: event.clientX, y: event.clientY } : null);
    this.chatUi.toggle();
  }

  protected onFocusChange(focused: boolean): void {
    this.focused = focused;
    this.think();
  }

  /** Press: it becomes a drag once the pointer travels a few px. */
  protected onGrab(event: PointerEvent): void {
    if (!this.present() || event.button !== 0) return;
    const target = event.currentTarget as HTMLElement;
    this.grab = {
      id: event.pointerId,
      offset: { x: event.clientX - this.pos.x, y: event.clientY - this.pos.y },
      start: { x: event.clientX, y: event.clientY },
      moved: false,
      samples: [{ x: event.clientX, y: event.clientY, at: this.now() }],
    };
    target.setPointerCapture?.(event.pointerId);
    const move = (e: PointerEvent) => this.onDrag(e);
    const end = (e: PointerEvent) => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      this.onDrop(e);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }

  private onDrag(event: PointerEvent): void {
    const grab = this.grab;
    if (!grab || event.pointerId !== grab.id) return;
    if (!grab.moved) {
      if (Math.hypot(event.clientX - grab.start.x, event.clientY - grab.start.y) < DRAG_THRESHOLD) return;
      grab.moved = true;
      this.cancelMove();
      this.dragging.set(true);
      this.flying = false;
      this.gliding = false;
      this.lift = 0;
      this.liftVel = 0;
      this.jelly.grounded = false;
      this.setAngle(0);
      this.think();
    }
    const now = this.now();
    grab.samples.push({ x: event.clientX, y: event.clientY, at: now });
    while (grab.samples.length > 2 && now - grab.samples[0].at > VELOCITY_WINDOW_MS) grab.samples.shift();
    const size = this.size();
    this.pos = {
      x: clamp(event.clientX - grab.offset.x, 0, this.viewport.width - size.width),
      y: clamp(event.clientY - grab.offset.y, 0, this.viewport.height - size.height),
    };
    this.pointer = { x: event.clientX, y: event.clientY };
    this.wake();
  }

  private onDrop(event: PointerEvent): void {
    const grab = this.grab;
    this.grab = null;
    if (!grab || !grab.moved) return;
    this.dragging.set(false);
    // A click follows only a real pointerup; never keep the flag around.
    this.suppressClick = event.type === 'pointerup';
    setTimeout(() => (this.suppressClick = false), 0);

    if (this.docked) {
      this.jelly.grounded = true;
      this.gliding = true;
      this.vel = { x: 0, y: 0 };
    } else if (this.still()) {
      this.land(this.nearestSpot(this.pos), 0);
    } else {
      // Thrown: the pointer's last speed carries on.
      const first = grab.samples[0];
      const last = grab.samples[grab.samples.length - 1];
      const span = Math.max(16, last.at - first.at) / 1000;
      let vx = (last.x - first.x) / span;
      let vy = (last.y - first.y) / span;
      const speed = Math.hypot(vx, vy);
      if (speed > THROW_MAX_PX_S) {
        vx *= THROW_MAX_PX_S / speed;
        vy *= THROW_MAX_PX_S / speed;
      }
      this.vel = { x: vx, y: vy };
      this.flying = true;
    }
    this.think();
    this.wake();
  }

  // --- Events -------------------------------------------------------------

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.present()) return;
    this.pointer = { x: event.clientX, y: event.clientY };
    this.pointerMovedAt = this.now();
    // Coming close gets an answer at once, not at the next think.
    if (!this.touch && this.brain.pose !== 'out' && (this.distanceToPointer() ?? Infinity) <= NEAR_PX) this.think();
    this.wake();
  };

  private readonly onVisibility = () => {
    if (this.view()?.document.hidden) this.pause();
    else if (!this.ui.drawerOpen()) this.resume();
  };

  private readonly onResize = () => {
    const view = this.view();
    if (!view || !this.setupDone) return;
    this.measure(view);
    if (this.docked) this.pos = this.dockedPosition();
    else if (!this.flying && !this.grab) this.standOn(this.t);
    this.wake();
  };

  private readonly onScroll = () => {
    const view = this.view();
    if (!view || !this.touch || this.scrollScheduled) return;
    this.scrollScheduled = true;
    view.requestAnimationFrame(() => {
      this.scrollScheduled = false;
      const y = view.scrollY;
      const delta = y - this.lastScrollY;
      this.lastScrollY = y;
      if (y > 24 && delta > SCROLL_SLIDE_DELTA && !this.slidAway()) this.slidAway.set(true);
      else if (delta < -SCROLL_SLIDE_DELTA && this.slidAway()) this.slidAway.set(false);
    });
  };

  // --- State changes ------------------------------------------------------

  private syncStillness(modeStill: boolean): void {
    const next = modeStill || this.reducedMotion;
    if (next === this.still()) return;
    this.still.set(next);
    if (!this.setupDone) return;
    if (next) {
      this.flying = false;
      this.lift = 0;
      this.liftVel = 0;
      this.jelly.grounded = true;
      resetJelly(this.jelly);
      if (!this.docked) this.standOn(this.t);
    }
    this.think();
    this.wake();
  }

  private setDocked(open: boolean): void {
    this.docked = open;
    if (open) {
      this.flying = false;
      this.lift = 0;
      this.liftVel = 0;
      this.jelly.grounded = true;
      this.setAngle(0);
      this.vel = { x: 0, y: 0 };
      if (this.still()) {
        this.pos = this.dockedPosition();
      } else {
        this.gliding = true;
      }
      if (this.touch) this.slidAway.set(false);
    } else {
      this.gliding = false;
      this.t = this.nearestSpot(this.pos);
      this.standOn(this.t);
      const pending = this.pendingMove;
      this.pendingMove = null;
      if (pending) setTimeout(() => this.performMove(pending), 400);
    }
    this.think();
    this.render();
    this.wake();
  }

  private pause(): void {
    this.cancelMove();
    this.paused = true;
    this.stopLoop();
    this.stopThinking();
  }

  private resume(): void {
    const wasPaused = this.paused;
    this.paused = false;
    if (!this.setupDone || this.destroyed || !wasPaused) return;
    this.prevPos = [];
    this.prevRigY = [];
    this.startThinking();
    this.wake();
  }

  // --- Mood ---------------------------------------------------------------

  /** Any reason to stand fully out: no mood games then. */
  private holdOut(): boolean {
    return (
      this.still() || this.touch || this.focused || this.docked || this.dragging() || this.flying || this.moving
    );
  }

  private startThinking(): void {
    this.stopThinking();
    const view = this.view();
    if (!view) return;
    this.thinkTimer = view.setInterval(() => this.think(), THINK_MS) as unknown as number;
  }

  private stopThinking(): void {
    if (this.thinkTimer) this.view()?.clearInterval(this.thinkTimer);
    this.thinkTimer = 0;
  }

  /** Runs the mood a few times a second and wakes the loop when it changed. */
  private think(): void {
    if (!this.setupDone || this.paused || this.destroyed) return;
    const now = this.now();
    const before = this.brain;
    const size = this.size();
    const pointer = this.touch ? null : this.pointer;
    this.brain = decide(this.brain, {
      now,
      distance: pointer ? this.distanceToPointer() : null,
      pointerMovedAt: pointer ? this.pointerMovedAt : null,
      pointerT: pointer ? this.nearestSpot({ x: pointer.x - size.width / 2, y: pointer.y - size.height / 2 }) : null,
      t: this.t,
      holdOut: this.holdOut(),
    });
    const out = this.brain.pose === 'out';
    if (out && !this.wasOut && !this.holdOut()) this.hop();
    this.wasOut = out;

    // A new idle glance when the last one is over; it shows only once the pointer rests.
    const following = this.followingPointer(now);
    if (now >= this.gaze.until && !this.still()) {
      this.gaze = nextGaze(now);
      if (!following) this.wake();
    }
    // The pointer just stopped: the eyes drift back to their own glance.
    if (this.wasFollowing && !following) this.wake();
    this.wasFollowing = following;
    if (now >= this.nextBlinkAt && this.brain.pose !== 'lurk' && !this.still()) {
      this.blink();
      this.nextBlinkAt = now + BLINK_MIN_MS + Math.random() * BLINK_SPAN_MS;
    }
    if (this.brain !== before) this.wake();
  }

  /** Glad to see you: a little jump out of the edge, stretching on take-off. */
  private hop(): void {
    if (this.lift > 0 || this.still()) return;
    this.liftVel = HOP_PX_S;
    this.lift = 0.01;
    this.jelly.grounded = false;
    shove(this.jelly, { x: 0, y: (-HOP_PX_S * LANDING_SHOVE * 0.6) / this.pxPerUnit() });
  }

  private blink(): void {
    const host = this.hostRef.nativeElement;
    host.classList.add('mascot-blink');
    clearTimeout(this.blinkTimer);
    this.blinkTimer = setTimeout(() => host.classList.remove('mascot-blink'), BLINK_CLOSED_MS) as unknown as number;
  }

  /** A click dents the jelly where the pointer pressed (keyboard: on its head). */
  private pokeAt(client: Vec | null): void {
    if (this.still() || !this.setupDone) return;
    const size = this.size();
    const unit = this.pxPerUnit();
    let at: Vec = { x: BODY.x + BODY.size / 2, y: BODY.y };
    if (client) {
      const dx = client.x - (this.pos.x + size.width / 2);
      const dy = client.y - (this.pos.y + size.height / 2);
      const local = rotate({ x: dx, y: dy }, -this.angle);
      at = { x: 50 + local.x / unit, y: 50 + local.y / unit - this.rigOffset() };
    }
    poke(this.jelly, at, POKE_STRENGTH);
    this.wake();
  }

  // --- The loop -----------------------------------------------------------

  private wake(): void {
    const view = this.view();
    if (this.rafId !== 0 || !view || this.paused || this.destroyed || !this.setupDone) return;
    this.rafId = view.requestAnimationFrame(this.frame);
  }

  private stopLoop(): void {
    const view = this.view();
    if (this.rafId !== 0 && view) view.cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.lastFrame = 0;
  }

  private readonly frame = (time: number): void => {
    this.rafId = 0;
    if (this.paused || this.destroyed) return;
    const dt = this.lastFrame ? clamp((time - this.lastFrame) / 1000, 0.001, 0.05) : 1 / 60;
    this.lastFrame = time;
    const moving = this.step(dt);
    this.render();
    if (moving) {
      this.wake();
    } else {
      this.lastFrame = 0;
      this.prevPos = [];
      this.prevRigY = [];
    }
  };

  /** Advances everything by dt seconds; true while anything still moves. */
  private step(dt: number): boolean {
    const still = this.still();
    let moving = false;

    // 1. Where the box is.
    if (this.grab?.moved) {
      moving = true;
    } else if (this.flying) {
      this.fly(dt);
      moving = true;
    } else if (this.dashState) {
      moving = this.runDash(dt);
    } else if (this.gliding) {
      moving = this.glide(dt);
    } else if (this.brain.target !== null && !this.holdOut()) {
      moving = this.creep(dt);
    } else {
      this.vel = { x: 0, y: 0 };
    }

    // 2. How far out of the edge, and the hop.
    const targetReveal = this.revealPin ?? (this.holdOut() ? 1 : REVEAL[this.brain.pose]);
    if (still) {
      this.reveal = targetReveal;
      this.revealVel = 0;
    } else {
      const k = targetReveal > this.reveal ? REVEAL_K_UP : REVEAL_K_DOWN;
      this.revealVel += (k * (targetReveal - this.reveal) - 2 * REVEAL_ZETA * Math.sqrt(k) * this.revealVel) * dt;
      this.reveal += this.revealVel * dt;
      if (Math.abs(targetReveal - this.reveal) < 0.002 && Math.abs(this.revealVel) < 0.01) {
        this.reveal = targetReveal;
        this.revealVel = 0;
      } else {
        moving = true;
      }
    }
    if (this.lift > 0) {
      this.liftVel -= GRAVITY_PX_S2 * dt;
      this.lift += this.liftVel * dt;
      if (this.lift <= 0) {
        // Back on its edge: the jelly squashes by the impact speed.
        this.jelly.grounded = true;
        this.spin = 0;
        this.spinVel = 0;
        shove(this.jelly, { x: 0, y: (-this.liftVel * LANDING_SHOVE) / this.pxPerUnit() });
        this.lift = 0;
        this.liftVel = 0;
      }
      moving = true;
    }

    if (this.spinVel !== 0) {
      this.spin += this.spinVel * dt;
      moving = true;
    }
    if (this.lean !== this.leanTarget) {
      const next = this.lean + (this.leanTarget - this.lean) * Math.min(1, dt * 22);
      this.lean = Math.abs(this.leanTarget - next) < 0.1 ? this.leanTarget : next;
      moving = true;
    }

    // 3. The jelly feels the box's and the rig's acceleration, in its own frame.
    if (still) {
      resetJelly(this.jelly);
    } else {
      this.updateForce(dt);
      stepJelly(this.jelly, dt, this.force);
      if (!jellySettled(this.jelly) || Math.hypot(this.force.x, this.force.y) > 1) moving = true;
    }

    // 4. Pupils and headband tails.
    const look = this.pupilTarget();
    const lerp = still ? 1 : PUPIL_LERP;
    const px = this.pupil.x + (look.x - this.pupil.x) * lerp;
    const py = this.pupil.y + (look.y - this.pupil.y) * lerp;
    if (Math.abs(px - this.pupil.x) > 0.01 || Math.abs(py - this.pupil.y) > 0.01) moving = true;
    this.pupil = { x: px, y: py };

    const top = this.jelly.points[2];
    const lean = top.pos.x - top.rest.x;
    const localVel = rotate(this.vel, -this.angle);
    const tailTarget = still ? 0 : clamp(-localVel.x * 0.05 - lean * 2.4, -TAIL_MAX_DEG, TAIL_MAX_DEG);
    const tail = this.tailAngle + (tailTarget - this.tailAngle) * 0.2;
    if (Math.abs(tail - this.tailAngle) > 0.05) moving = true;
    this.tailAngle = tail;

    return moving;
  }

  /** The pseudo-force: minus the box's acceleration, turned into the body frame. */
  private updateForce(dt: number): void {
    const unit = this.pxPerUnit();
    this.prevPos.push({ ...this.pos });
    this.prevRigY.push(this.rigOffset());
    if (this.prevPos.length > 3) this.prevPos.shift();
    if (this.prevRigY.length > 3) this.prevRigY.shift();

    let target: Vec = { x: 0, y: 0 };
    if (this.settleFrames > 0) {
      this.settleFrames--;
    } else if (this.prevPos.length === 3) {
      const [p0, p1, p2] = this.prevPos;
      // In free flight the jelly falls with its box: gravity does not deform it.
      const ax = (p2.x - 2 * p1.x + p0.x) / (dt * dt);
      const ay = (p2.y - 2 * p1.y + p0.y) / (dt * dt) - (this.flying ? GRAVITY_PX_S2 : 0);
      const local = rotate({ x: ax, y: ay }, -this.angle);
      const [y0, y1, y2] = this.prevRigY;
      const rigAy = (y2 - 2 * y1 + y0) / (dt * dt); // already in units
      target = { x: (-local.x / unit) * JELLY_STRENGTH, y: (-local.y / unit - rigAy) * JELLY_STRENGTH };
      const mag = Math.hypot(target.x, target.y);
      if (mag > FORCE_MAX) target = { x: (target.x / mag) * FORCE_MAX, y: (target.y / mag) * FORCE_MAX };
    }
    this.force = {
      x: this.force.x + (target.x - this.force.x) * FORCE_SMOOTHING,
      y: this.force.y + (target.y - this.force.y) * FORCE_SMOOTHING,
    };
  }

  /** Free flight after a throw: gravity, a little drag, and walls to stick to. */
  private fly(dt: number): void {
    const size = this.size();
    const maxX = this.viewport.width - size.width;
    const maxY = this.viewport.height - size.height;
    const drag = Math.max(0, 1 - AIR_DRAG * dt);
    this.vel = { x: this.vel.x * drag, y: (this.vel.y + GRAVITY_PX_S2 * dt) * drag };
    let x = this.pos.x + this.vel.x * dt;
    let y = this.pos.y + this.vel.y * dt;

    if (y < 0) {
      y = 0;
      this.vel.y = Math.abs(this.vel.y) * WALL_BOUNCE;
    }
    if (y >= maxY) {
      this.pos = { x: clamp(x, 0, maxX), y: maxY };
      this.land(this.nearestSpot(this.pos, 'bottom'), this.vel.y, this.vel.x);
      return;
    }
    if (x >= maxX || x <= 0) {
      const wall: MascotEdge = x >= maxX ? 'right' : 'left';
      x = clamp(x, 0, maxX);
      if (y >= HEADER_RESERVE) {
        // Sticks to the wall it hit; the body turns to stand on it.
        this.pos = { x, y };
        const into = wall === 'right' ? this.vel.x : -this.vel.x;
        const along = wall === 'right' ? -this.vel.y : this.vel.y;
        this.land(this.nearestSpot(this.pos, wall), into, along);
        return;
      }
      this.vel.x = -this.vel.x * WALL_BOUNCE;
    }
    this.pos = { x, y };
  }

  /** Comes to rest on the edge spot `t`; the jelly takes the impact. */
  private land(t: number, impact: number, slide = 0): void {
    this.flying = false;
    this.spin = 0;
    this.spinVel = 0;
    this.vel = { x: 0, y: 0 };
    this.t = t;
    this.saveT(t);
    this.standOn(t);
    this.jelly.grounded = true;
    if (!this.still()) {
      const unit = this.pxPerUnit();
      shove(this.jelly, { x: (slide * LANDING_SHOVE * 0.5) / unit, y: (Math.abs(impact) * LANDING_SHOVE) / unit });
    }
    this.think();
    this.wake();
  }

  /** The glide to the docked spot by the open pane. */
  private glide(dt: number): boolean {
    const target = this.dockedPosition();
    const c = 2 * Math.sqrt(DOCK_K);
    this.vel = {
      x: this.vel.x + (DOCK_K * (target.x - this.pos.x) - c * this.vel.x) * dt,
      y: this.vel.y + (DOCK_K * (target.y - this.pos.y) - c * this.vel.y) * dt,
    };
    this.pos = { x: this.pos.x + this.vel.x * dt, y: this.pos.y + this.vel.y * dt };
    if (Math.hypot(target.x - this.pos.x, target.y - this.pos.y) < 0.5 && Math.hypot(this.vel.x, this.vel.y) < 5) {
      this.pos = { ...target };
      this.vel = { x: 0, y: 0 };
      this.gliding = false;
      return false;
    }
    return true;
  }

  /** Creeps along the edges, head down, towards the mood's target. */
  private creep(dt: number): boolean {
    const target = this.brain.target!;
    // Duck first, then move.
    if (this.reveal > REVEAL.lurk + 0.06) return true;
    const perimeter = Math.max(1, walkableLength(this.viewport, this.size()));
    const delta = circularDelta(this.t, target);
    const step = (CREEP_PX_S * dt) / perimeter;
    if (Math.abs(delta) <= step) {
      this.t = target;
      this.standOn(target);
      this.vel = { x: 0, y: 0 };
      this.saveT(target);
      this.brain = arrived(this.brain, this.now());
      return true;
    }
    const before = { ...this.pos };
    this.t = (((this.t + Math.sign(delta) * step) % 1) + 1) % 1;
    this.standOn(this.t);
    this.vel = { x: (this.pos.x - before.x) / dt, y: (this.pos.y - before.y) / dt };
    return true;
  }

  // --- Rendering ----------------------------------------------------------

  /**
   * Writes the frame. Only values that changed reach the DOM, so a still
   * mascot whose eyes move costs two style writes, not ten.
   */
  private render(): void {
    if (this.destroyed) return;
    this.setVar('--mascot-x', `${Math.round(this.pos.x)}px`);
    this.setVar('--mascot-y', `${Math.round(this.pos.y)}px`);
    this.setVar('--mascot-rot', `${this.angle}deg`);
    this.setVar('--pupil-x', this.pupil.x.toFixed(2));
    this.setVar('--pupil-y', this.pupil.y.toFixed(2));
    this.setVar('--tail-angle', this.tailAngle.toFixed(1));

    const turn = (this.spin % 360) + this.lean;
    const spin = turn === 0 ? '' : ` rotate(${turn.toFixed(1)} 50 69)`;
    this.setAttr(this.rigEl()?.nativeElement, 'transform', `translate(0 ${this.rigOffset().toFixed(2)})${spin}`);
    // A jelly at rest draws the same shape every frame: skip building it.
    const settled = jellySettled(this.jelly);
    if (settled && this.jellyDrawnAtRest && !this.elementsChanged()) return;
    this.setAttr(this.bodyEl()?.nativeElement, 'd', jellyPath(this.jelly));
    this.setAttr(this.faceEl()?.nativeElement, 'transform', featureTransform(this.jelly, EYES_Y));
    this.setAttr(this.bandEl()?.nativeElement, 'transform', featureTransform(this.jelly, BAND_Y));
    this.jellyDrawnAtRest = settled;
  }

  private setVar(name: string, value: string): void {
    if (this.writtenVars.get(name) === value) return;
    this.writtenVars.set(name, value);
    this.hostRef.nativeElement.style.setProperty(name, value);
  }

  /** The cache is per element: the template recreates them after the drawer or hidden mode. */
  private setAttr(el: Element | undefined, name: string, value: string): void {
    if (!el) return;
    let attrs = this.writtenAttrs.get(el);
    if (!attrs) {
      attrs = new Map();
      this.writtenAttrs.set(el, attrs);
    }
    if (attrs.get(name) === value) return;
    attrs.set(name, value);
    el.setAttribute(name, value);
  }

  /** True when the body element is not the one last drawn (the template rebuilt it). */
  private elementsChanged(): boolean {
    const body = this.bodyEl()?.nativeElement;
    return body !== undefined && !this.writtenAttrs.has(body);
  }

  /** The rig's offset along the body's down axis (units): sunk by the reveal, raised by a hop. */
  private rigOffset(): number {
    return (1 - this.reveal) * SINK_UNITS - (this.lift + this.bob) / this.pxPerUnit();
  }

  // --- Positions ----------------------------------------------------------

  /** Stands on the perimeter spot `t`, its feet against that edge. */
  private standOn(t: number): void {
    const spot: EdgePosition = edgePosition(t, this.viewport, this.size());
    this.pos = { x: spot.x, y: spot.y };
    this.setAngle(EDGE_ANGLE[spot.edge]);
  }

  private setAngle(angle: number): void {
    if (angle !== this.angle) this.settleFrames = 3;
    this.angle = angle;
  }

  /** The perimeter spot nearest a box position (on `edge` when given), out of the toast corner. */
  private nearestSpot(point: Vec, edge?: MascotEdge): number {
    const size = this.size();
    const onEdge =
      edge === 'bottom'
        ? { x: point.x, y: this.viewport.height }
        : edge === 'right'
          ? { x: this.viewport.width, y: point.y }
          : edge === 'left'
            ? { x: -size.width, y: point.y }
            : point;
    const t = nearestEdgeParam(onEdge, this.viewport, size);
    const spot = edgePosition(t, this.viewport, size);
    const moved = avoidToastCorner(spot, this.viewport, size, this.notifications.notifications().length > 0);
    return moved === spot ? t : nearestEdgeParam(moved, this.viewport, size);
  }

  private dockedPosition(): Vec {
    const size = this.size();
    return { x: Math.max(0, this.viewport.width - this.paneWidth() - size.width), y: this.viewport.height - size.height };
  }

  /**
   * The open pane's width from :root. getComputedStyle forces a style pass,
   * so the docking glide reads it at most every 250 ms, not every frame.
   */
  private paneWidth(): number {
    const now = this.now();
    if (now - this.paneWidthReadAt < 250) return this.paneWidthCache;
    const raw = getComputedStyle(this.document.documentElement).getPropertyValue('--chat-pane-width').trim();
    const value = Number.parseFloat(raw);
    this.paneWidthCache = Number.isFinite(value) ? value : 0;
    this.paneWidthReadAt = now;
    return this.paneWidthCache;
  }

  /** True while the real button is on screen and the app is in the foreground. */
  private present(): boolean {
    return (
      this.setupDone &&
      !this.destroyed &&
      !this.paused &&
      this.chatUi.available() &&
      this.chatUi.mascotMode() !== 'hidden' &&
      !this.ui.drawerOpen()
    );
  }

  private size(): Size {
    const px = this.touch ? MascotComponent.SIZE.mobile : MascotComponent.SIZE.desktop;
    return { width: px, height: px };
  }

  private pxPerUnit(): number {
    return this.size().width / 100;
  }

  private centre(): Vec {
    const size = this.size();
    return { x: this.pos.x + size.width / 2, y: this.pos.y + size.height / 2 };
  }

  private distanceToPointer(): number | null {
    if (!this.pointer) return null;
    const c = this.centre();
    return Math.hypot(this.pointer.x - c.x, this.pointer.y - c.y);
  }

  /** True while the pointer moves (or just moved): the eyes follow it then. */
  private followingPointer(now = this.now()): boolean {
    return (
      this.pointer !== null &&
      (this.grab !== null || (this.pointerMovedAt !== null && now - this.pointerMovedAt < LOOK_AT_POINTER_MS))
    );
  }

  private pupilTarget(): Vec {
    if (this.lookOverride) return { x: this.lookOverride.x * PUPIL_MAX, y: this.lookOverride.y * PUPIL_MAX };
    if (!this.followingPointer()) {
      // Chilling: by the open pane it reads the conversation; otherwise it
      // looks at the visitor or glances around. Body frame, no rotation.
      if (this.docked) return { x: PUPIL_MAX, y: 0 };
      if (this.still()) return { x: 0, y: 0 };
      return { x: this.gaze.x * PUPIL_MAX, y: this.gaze.y * PUPIL_MAX };
    }
    const c = this.centre();
    const look = pupilOffset(
      { x: c.x - PUPIL_BOX_HALF, y: c.y - PUPIL_BOX_HALF, width: PUPIL_BOX_HALF * 2, height: PUPIL_BOX_HALF * 2 },
      this.pointer!,
      PUPIL_MAX,
    );
    return rotate(look, -this.angle);
  }

  // --- Ninja moves ----------------------------------------------------------

  /** Performs a move the chat asked for. Under reduced motion or 'still' it is skipped. */
  private performMove(name: NinjaMove): void {
    if (!this.setupDone || this.paused || this.destroyed || this.still() || this.grab) return;
    if (this.docked && this.paneWidth() === 0) {
      // The chat covers the screen (narrow layout): perform it once it closes.
      this.pendingMove = name;
      return;
    }
    this.cancelMove();
    const token = ++this.moveToken;
    this.moving = true;
    this.gliding = false;
    this.brain = { ...this.brain, target: null };
    void runNinjaMove(name, this.moveBody(token)).finally(() => {
      if (token === this.moveToken) this.finishMove();
    });
    this.wake();
  }

  private cancelMove(): void {
    if (!this.moving) return;
    this.moveToken++;
    this.finishMove();
  }

  /** Back to normal life: the mood decides again, and it returns to its dock. */
  private finishMove(): void {
    this.moving = false;
    this.revealPin = null;
    this.lookOverride = null;
    this.bob = 0;
    this.hostRef.nativeElement.classList.remove('mascot-squint', 'mascot-dash');
    this.leanTarget = 0;
    const dash = this.dashState;
    this.dashState = null;
    dash?.resolve();
    if (this.docked && !this.flying) {
      this.setAngle(0);
      this.gliding = true;
    }
    this.think();
    this.wake();
  }

  private moveBody(token: number): MoveBody {
    const alive = () => token === this.moveToken && !this.destroyed && !this.paused;
    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const size = () => this.size();
    return {
      alive,
      sleep,
      until: async (done, timeoutMs) => {
        const end = this.now() + timeoutMs;
        while (alive() && !done() && this.now() < end) await sleep(30);
      },
      viewport: () => this.viewport,
      size,
      edge: () => (this.docked ? 'bottom' : edgePosition(this.t, this.viewport, size()).edge),
      t: () => (this.docked ? nearestEdgeParam(this.dockedPosition(), this.viewport, size()) : this.t),
      position: () => ({ ...this.pos }),
      docked: () => this.docked,
      reveal: (value) => {
        this.revealPin = value;
        this.wake();
      },
      jump: (speed, spin) => {
        if (!alive()) return;
        this.liftVel = speed;
        this.lift = 0.01;
        this.jelly.grounded = false;
        this.spinVel = spin / ((2 * speed) / GRAVITY_PX_S2);
        shove(this.jelly, { x: 0, y: (-speed * LANDING_SHOVE * 0.6) / this.pxPerUnit() });
        this.wake();
      },
      airborne: () => this.lift > 0,
      leap: (velocity, spinPerSecond) => {
        if (!alive()) return;
        this.gliding = false;
        this.lift = 0;
        this.liftVel = 0;
        this.setAngle(0);
        this.vel = { ...velocity };
        this.flying = true;
        this.jelly.grounded = false;
        this.spinVel = spinPerSecond;
        this.wake();
      },
      flying: () => this.flying,
      dash: (target, speed) =>
        new Promise<void>((resolve) => {
          if (!alive()) return resolve();
          if (this.docked) {
            // Leave the dock spot for the walk; the dock is where it returns.
            this.t = nearestEdgeParam(this.pos, this.viewport, size());
          }
          this.dashState = { target, speed, resolve };
          this.wake();
        }),
      wallSpot: (wall, y) =>
        nearestEdgeParam({ x: wall === 'right' ? this.viewport.width : -size().width, y }, this.viewport, size()),
      teleport: (t) => {
        if (!alive()) return;
        this.t = t;
        this.standOn(t);
        this.saveT(t);
        this.wake();
      },
      look: (direction) => {
        this.lookOverride = direction;
        this.wake();
      },
      squint: (on) => this.hostRef.nativeElement.classList.toggle('mascot-squint', on),
      lean: (deg) => {
        this.leanTarget = deg;
        this.wake();
      },
      trail: (direction) => {
        const host = this.hostRef.nativeElement;
        host.classList.toggle('mascot-dash', direction !== 0);
        if (direction !== 0) this.setVar('--dash-dir', String(direction));
      },
      poof: () => {
        const host = this.hostRef.nativeElement;
        host.classList.remove('mascot-poof');
        void host.offsetWidth; // restart the CSS animation
        host.classList.add('mascot-poof');
      },
      squish: (v) => {
        shove(this.jelly, { x: v.x * JELLY_STRENGTH, y: v.y * JELLY_STRENGTH });
        this.wake();
      },
    };
  }

  /** Runs along the edges at a ninja's pace, legs bobbing, to the dash target. */
  private runDash(dt: number): boolean {
    const dash = this.dashState!;
    const perimeter = Math.max(1, walkableLength(this.viewport, this.size()));
    const delta = circularDelta(this.t, dash.target);
    const step = (dash.speed * dt) / perimeter;
    this.dashPhase += dt * 26;
    this.bob = Math.abs(Math.sin(this.dashPhase)) * 4;
    if (Math.abs(delta) <= step) {
      this.t = dash.target;
      this.standOn(dash.target);
      this.saveT(dash.target);
      this.vel = { x: 0, y: 0 };
      this.bob = 0;
      this.dashState = null;
      dash.resolve();
      return true;
    }
    const before = { ...this.pos };
    this.t = (((this.t + Math.sign(delta) * step) % 1) + 1) % 1;
    this.standOn(this.t);
    this.vel = { x: (this.pos.x - before.x) / dt, y: (this.pos.y - before.y) / dt };
    return true;
  }

  private measure(view: Window): void {
    this.viewport = { width: view.innerWidth || 1280, height: view.innerHeight || 800 };
  }

  private savedT(): number | null {
    try {
      const value = Number.parseFloat(this.view()?.localStorage.getItem(POSITION_KEY) ?? '');
      return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
    } catch {
      return null;
    }
  }

  private saveT(t: number): void {
    try {
      this.view()?.localStorage.setItem(POSITION_KEY, t.toFixed(4));
    } catch {
      // Storage blocked: the spot is kept for this page view only.
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rotates a vector by `deg` degrees, clockwise on screen (y points down). */
function rotate(v: Vec, deg: number): Vec {
  if (deg === 0) return v;
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}
