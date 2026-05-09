import { Component, input } from '@angular/core';
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

  currentImageIndex: number = 0;

  nextImage(): void {
    if (this.photoUrls().length > 0) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.photoUrls().length;
    }
  }

  previousImage(): void {
    if (this.photoUrls().length > 0) {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.photoUrls().length) % this.photoUrls().length;
    }
  }

  goToImage(index: number): void {
    if (index >= 0 && index < this.photoUrls().length) {
      this.currentImageIndex = index;
    }
  }
}
