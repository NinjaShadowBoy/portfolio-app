import { Component, effect, input, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

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

  @ViewChild('carouselImage') carouselImage!: ElementRef<HTMLImageElement>;

  currentImageIndex = signal(0);
  isHovered = signal(false);
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
      if (!this.isHovered()) {
        this.nextImage();
      }
    }, this.autoPlayDelay);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
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
    const image = this.carouselImage?.nativeElement;
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
