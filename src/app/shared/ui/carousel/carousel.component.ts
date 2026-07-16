import { Component, HostListener, PLATFORM_ID, Renderer2, effect, inject, input, signal, ElementRef, viewChild } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule],
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
    if (el) {
      this.renderer.appendChild(this.document.body, el);
    }
  });
  private autoPlayInterval: ReturnType<typeof setInterval> | null = null;
  private autoPlayDelay = 5000; // 5 seconds

  private readonly autoPlayEffect = effect(() => {
    const urls = this.photoUrls();
    if (urls.length <= 1) {
      this.stopAutoPlay();
      return;
    }

    this.startAutoPlay();
    return () => this.stopAutoPlay();
  });

  private startAutoPlay(): void {
    if (this.photoUrls().length <= 1) return;

    this.stopAutoPlay();
    this.autoPlayInterval = setInterval(() => {
      if (!this.isHovered() && !this.isFullscreen()) {
        this.nextImage();
      }
    }, this.autoPlayDelay);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  openFullscreen(): void {
    this.isFullscreen.set(true);
  }

  closeFullscreen(): void {
    this.isFullscreen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isFullscreen()) {
      this.closeFullscreen();
    }
  }

  onHover(): void {
    this.isHovered.set(true);
  }

  onLeave(): void {
    this.isHovered.set(false);
  }

  nextImage(): void {
    if (this.photoUrls().length > 0) {
      this.fadeOutAndChangeImage(() => {
        this.currentImageIndex.update((index) => (index + 1) % this.photoUrls().length);
      });
    }
  }

  previousImage(): void {
    if (this.photoUrls().length > 0) {
      this.fadeOutAndChangeImage(() => {
        this.currentImageIndex.update(
          (index) => (index - 1 + this.photoUrls().length) % this.photoUrls().length
        );
      });
    }
  }

  goToImage(index: number): void {
    if (index >= 0 && index < this.photoUrls().length) {
      this.fadeOutAndChangeImage(() => {
        this.currentImageIndex.set(index);
      });
    }
  }

  private fadeOutAndChangeImage(changeImageCallback: () => void): void {
    const image = this.carouselImage()?.nativeElement;
    if (image) {
      image.style.opacity = '0.3';
      setTimeout(() => {
        changeImageCallback();
        setTimeout(() => {
          image.style.opacity = '1';
        }, 50);
      }, 300);
    }
  }
}
