import {
  Component,
  PLATFORM_ID,
  Renderer2,
  computed,
  effect,
  inject,
  input,
  signal,
  ElementRef,
  viewChild,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { cloudinarySrcset, cloudinaryUrl } from '../../../core/utils/cloudinary';

/** Horizontal travel, in px, that counts as a swipe in the lightbox. */
const SWIPE_DISTANCE = 50;

const AUTO_PLAY_DELAY = 5000;

@Component({
  selector: 'app-carousel',
  host: { '(document:keydown.escape)': 'onEscape()' },
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.css',
})
export class CarouselComponent {
  photoUrls = input.required<string[]>();
  projectName = input.required<string>();
  /** `eager` for a carousel above the fold (project page), `lazy` in card grids. */
  loading = input<'lazy' | 'eager'>('lazy');
  /** False inside project cards: the image then belongs to the card's link, not a lightbox. */
  fullscreen = input(true);
  /** Rendered width of the image for `srcset`, e.g. `(max-width: 700px) 100vw, 400px`. */
  sizes = input('100vw');

  /** Resized Cloudinary sources; other hosts are served as they are. */
  readonly sources = computed(() =>
    this.photoUrls().map((url) => ({ src: cloudinaryUrl(url, 1200), srcset: cloudinarySrcset(url), full: cloudinaryUrl(url) })),
  );

  readonly carouselImage = viewChild.required<ElementRef<HTMLImageElement>>('carouselImage');
  readonly lightbox = viewChild<ElementRef<HTMLElement>>('lightbox');

  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  currentImageIndex = signal(0);
  isHovered = signal(false);
  isFullscreen = signal(false);

  // A project card animates on hover with `transform`, which makes any
  // descendant `position: fixed` element be contained by the card instead of
  // the viewport. Teleporting the open overlay to <body> escapes that context.
  private readonly teleportLightbox = effect(() => {
    if (!this.isBrowser || !this.isFullscreen()) return;
    const el = this.lightbox()?.nativeElement;
    if (el) this.renderer.appendChild(this.document.body, el);
  });

  // Auto-advance while there is more than one image and nobody is looking closely.
  private readonly autoPlay = effect((onCleanup) => {
    // Server render waits for the zone to settle; an interval there never ends.
    if (!this.isBrowser || this.photoUrls().length <= 1) return;
    const interval = setInterval(() => {
      if (!this.isHovered() && !this.isFullscreen()) this.nextImage();
    }, AUTO_PLAY_DELAY);
    onCleanup(() => clearInterval(interval));
  });

  openFullscreen(): void {
    if (this.fullscreen()) this.isFullscreen.set(true);
  }

  private swipeStartX: number | null = null;
  /** Set after a swipe so the click that follows it does not close the lightbox. */
  private swiped = false;

  onSwipeStart(event: PointerEvent): void {
    this.swipeStartX = event.isPrimary ? event.clientX : null;
    this.swiped = false;
  }

  onSwipeEnd(event: PointerEvent): void {
    if (this.swipeStartX === null || this.photoUrls().length <= 1) return;
    const dx = event.clientX - this.swipeStartX;
    this.swipeStartX = null;
    if (Math.abs(dx) < SWIPE_DISTANCE) return;
    this.swiped = true;
    if (dx < 0) this.nextImage();
    else this.previousImage();
  }

  onLightboxClick(): void {
    if (this.swiped) this.swiped = false;
    else this.closeFullscreen();
  }

  closeFullscreen(): void {
    this.isFullscreen.set(false);
  }

  onEscape(): void {
    this.closeFullscreen();
  }

  onHover(): void {
    this.isHovered.set(true);
  }

  onLeave(): void {
    this.isHovered.set(false);
  }

  nextImage(): void {
    this.goToImage(this.currentImageIndex() + 1);
  }

  previousImage(): void {
    this.goToImage(this.currentImageIndex() - 1);
  }

  goToLabel(index: number): string {
    return $localize`:Carousel go to image@@carouselGoToImage:Go to image ${index + 1}:INTERPOLATION:`;
  }

  /** Show the image at `index`, wrapping around at both ends, with a fade. */
  goToImage(index: number): void {
    const count = this.photoUrls().length;
    if (count === 0) return;
    const target = ((index % count) + count) % count;

    const image = this.carouselImage()?.nativeElement;
    if (!image) return;
    image.style.opacity = '0.3';
    setTimeout(() => {
      this.currentImageIndex.set(target);
      setTimeout(() => (image.style.opacity = '1'), 50);
    }, 300);
  }
}
