import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RatingDto {
  id: number;
  userId: number;
  projectId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingCreateDto {
  projectId: number;
  rating: number;
  comment?: string;
}

export interface RatingUpdateDto {
  rating?: number;
  comment?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RatingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/ratings`;

  /**
   * Get all ratings for a specific project
   */
  getRatingsByProject(projectId: number): Observable<RatingDto[]> {
    return this.http.get<RatingDto[]>(`${this.apiUrl}/project/${projectId}`);
  }

  /**
   * Get ratings by the current authenticated user
   */
  getMyRatings(): Observable<RatingDto[]> {
    return this.http.get<RatingDto[]>(`${this.apiUrl}/my-ratings`);
  }

  /**
   * Get rating distribution for a project (1-5 star breakdown)
   */
  getRatingDistribution(projectId: number): Observable<{ [key: number]: number }> {
    return this.http.get<{ [key: number]: number }>(
      `${this.apiUrl}/project/${projectId}/distribution`
    );
  }

  /**
   * Get average rating for a project
   */
  getAverageRating(projectId: number): Observable<{ averageRating: number }> {
    return this.http.get<{ averageRating: number }>(
      `${this.apiUrl}/project/${projectId}/average`
    );
  }

  /**
   * Get rating count for a project
   */
  getRatingCount(projectId: number): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(
      `${this.apiUrl}/project/${projectId}/count`
    );
  }

  /**
   * Check if the current user has rated a project
   */
  hasUserRatedProject(projectId: number): Observable<{ hasRated: boolean }> {
    return this.http.get<{ hasRated: boolean }>(
      `${this.apiUrl}/project/${projectId}/has-rated`
    );
  }

  /**
   * Create a new rating for a project
   */
  createRating(ratingData: RatingCreateDto): Observable<RatingDto> {
    return this.http.post<RatingDto>(this.apiUrl, ratingData);
  }

  /**
   * Update an existing rating
   */
  updateRating(ratingId: number, ratingData: RatingUpdateDto): Observable<RatingDto> {
    return this.http.put<RatingDto>(`${this.apiUrl}/${ratingId}`, ratingData);
  }

  /**
   * Delete a rating
   */
  deleteRating(ratingId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${ratingId}`);
  }

  /**
   * Reset all ratings for a project (admin only)
   */
  resetProjectRatings(projectId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/project/${projectId}`);
  }
}
