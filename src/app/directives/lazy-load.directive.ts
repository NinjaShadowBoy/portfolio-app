import { Directive, ElementRef, OnInit, OnDestroy, Input, Renderer2 } from '@angular/core';

/**
 * Lazy Load Directive for Images
 *
 * Improves LCP, FCP, and SI by:
 * - Using Intersection Observer API for efficient lazy loading
 * - Loading images only when they're about to enter the viewport
 * - Adding loading states with blur-up effect
 * - Supporting responsive images with srcset
 *
 * Usage:
 * <img appLazyLoad [src]="imageUrl" [alt]="altText">
 * <img appLazyLoad [src]="imageUrl" [placeholder]="thumbUrl">
 */
@Directive({
  selector: 'img[appLazyLoad]',
  standalone: true
})
export class LazyLoadDirective implements OnInit, OnDestroy {
  @Input() src: string = '';
  @Input() srcset: string = '';
  @Input() placeholder: string = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
  @Input() loadingClass: string = 'lazy-loading';
  @Input() loadedClass: string = 'lazy-loaded';
  @Input() errorClass: string = 'lazy-error';

  private observer?: IntersectionObserver;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    if (!this.supportsIntersectionObserver()) {
      // Fallback: load image immediately if IntersectionObserver not supported
      this.loadImage();
      return;
    }

    // Set placeholder
    this.renderer.setAttribute(this.el.nativeElement, 'src', this.placeholder);
    this.renderer.addClass(this.el.nativeElement, this.loadingClass);

    // Add loading attribute for native lazy loading support
    this.renderer.setAttribute(this.el.nativeElement, 'loading', 'lazy');

    // Create intersection observer
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadImage();
            this.observer?.unobserve(this.el.nativeElement);
          }
        });
      },
      {
        // Start loading image 50px before it enters viewport
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private loadImage(): void {
    const img = this.el.nativeElement;

    // Create a temporary image to preload
    const tempImg = new Image();

    tempImg.onload = () => {
      // Set the actual image source
      this.renderer.setAttribute(img, 'src', this.src);

      if (this.srcset) {
        this.renderer.setAttribute(img, 'srcset', this.srcset);
      }

      // Update classes
      this.renderer.removeClass(img, this.loadingClass);
      this.renderer.addClass(img, this.loadedClass);

      // Decode the image asynchronously for better performance
      if ('decode' in img) {
        img.decode()
          .catch(() => {
            // Silently fail - image will still display
          });
      }
    };

    tempImg.onerror = () => {
      this.renderer.removeClass(img, this.loadingClass);
      this.renderer.addClass(img, this.errorClass);
    };

    // Start loading
    tempImg.src = this.src;
    if (this.srcset) {
      tempImg.srcset = this.srcset;
    }
  }

  private supportsIntersectionObserver(): boolean {
    return 'IntersectionObserver' in window;
  }
}
