import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, OnInit, OnDestroy, Renderer2, PLATFORM_ID, inject, input } from '@angular/core';

/**
 * Lazy-loads an image with an IntersectionObserver: a placeholder is shown
 * until the element nears the viewport, then the real `src`/`srcset` is
 * preloaded and swapped in. Loading/loaded/error state classes drive the
 * blur-up effect. On the server, and in browsers without the observer, the
 * image loads immediately.
 *
 * Usage: <img appLazyLoad [src]="imageUrl" [alt]="altText" [placeholder]="thumbUrl">
 */
@Directive({
  selector: 'img[appLazyLoad]',
  standalone: true,
})
export class LazyLoadDirective implements OnInit, OnDestroy {
  src = input('');
  srcset = input('');
  placeholder = input('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E');
  loadingClass = input('lazy-loading');
  loadedClass = input('lazy-loaded');
  errorClass = input('lazy-error');

  private readonly img = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    if (!this.isBrowser) {
      this.renderer.setAttribute(this.img, 'src', this.src());
      return;
    }
    if (!('IntersectionObserver' in window)) {
      this.loadImage();
      return;
    }

    this.renderer.setAttribute(this.img, 'src', this.placeholder());
    this.renderer.addClass(this.img, this.loadingClass());
    this.renderer.setAttribute(this.img, 'loading', 'lazy');

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.loadImage();
          this.observer?.disconnect();
        }
      },
      { rootMargin: '50px', threshold: 0.01 } // Start 50px before it enters the viewport.
    );
    this.observer.observe(this.img);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private loadImage(): void {
    const src = this.src();
    const srcset = this.srcset();
    const preload = new Image();

    preload.onload = () => {
      this.renderer.setAttribute(this.img, 'src', src);
      if (srcset) this.renderer.setAttribute(this.img, 'srcset', srcset);
      this.renderer.removeClass(this.img, this.loadingClass());
      this.renderer.addClass(this.img, this.loadedClass());
      this.img.decode?.().catch(() => {}); // Decode off the main thread; the image displays either way.
    };
    preload.onerror = () => {
      this.renderer.removeClass(this.img, this.loadingClass());
      this.renderer.addClass(this.img, this.errorClass());
    };

    preload.src = src;
    if (srcset) preload.srcset = srcset;
  }
}
