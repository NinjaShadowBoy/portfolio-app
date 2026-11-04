import { Component, HostListener, PLATFORM_ID, Renderer2, effect, inject, input, signal, ElementRef, viewChild } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

const AUTO_PLAY_DELAY = 5000;

@Component({
  selector: 'app-carousel',
  standalone: true,
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
})
export class CarouselComponent {
  photoUrls = input.required<string[]>();
  projectName = input.required<string>();

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
    this.isFullscreen.set(true);
  }

  closeFullscreen(): void {
    this.isFullscreen.set(false);
  }

  @HostListener('document:keydown.escape')
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
