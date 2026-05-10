import { Component, input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
})
export class CarouselComponent implements OnInit, OnDestroy {
  photoUrls = input.required<string[]>();
  projectName = input.required<string>();

  currentImageIndex: number = 0;
  isHovered: boolean = false;
  private autoPlayInterval: any;
  private autoPlayDelay: number = 5000; // 5 seconds

  ngOnInit(): void {
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  private startAutoPlay(): void {
    if (this.photoUrls().length <= 1) return;

    this.autoPlayInterval = setInterval(() => {
      if (!this.isHovered) {
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
    this.isHovered = true;
  }

  onLeave(): void {
    this.isHovered = false;
  }

  nextImage(): void {
    if (this.photoUrls().length > 0) {
      this.fadeOutAndChangeImage(() => {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.photoUrls().length;
      });
    }
  }

  previousImage(): void {
    if (this.photoUrls().length > 0) {
      this.fadeOutAndChangeImage(() => {
        this.currentImageIndex = (this.currentImageIndex - 1 + this.photoUrls().length) % this.photoUrls().length;
      });
    }
  }

  goToImage(index: number): void {
    if (index >= 0 && index < this.photoUrls().length) {
      this.fadeOutAndChangeImage(() => {
        this.currentImageIndex = index;
      });
    }
  }

  private fadeOutAndChangeImage(changeImageCallback: () => void): void {
    const image = document.querySelector('.carousel-image') as HTMLImageElement;
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
