export interface Project {
  id: number; // Unique identifier for better tracking
  name: string;
  description: string;
  technologies: string[];
  githubLink: string | null;
  challenges: string | null;
  whatILearned: string | null;
  isExpanded?: boolean; // UI-only property, not from backend
  averageRating: number;
  totalRatings: number; // Backend returns this instead of ratings array
  createdAt: string; // ISO string from backend
  updatedAt: string; // ISO string from backend
  featured: boolean; // For homepage featured projects
  photoUrls: string[]; // Backend uses photoUrls (not photosUrls)
  photos?: Photo[]; // Optional: Full photo objects with IDs for deletion
}

export interface Photo {
  id: number;
  photoUrl: string;
  projectId: number;
}

export interface Rating {
  id: string;
  userId: string; // In a real app, this would be the actual user ID
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface ProjectFilters {
  searchTerm: string;
  technology: string;
  minRating: number;
  featured: boolean;
}
