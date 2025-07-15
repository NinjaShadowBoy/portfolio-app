export interface Project {
  id: string; // Unique identifier for better tracking
  name: string;
  description: string;
  technologies: string[];
  githubLink: string;
  challenges: string;
  whatILearned: string;
  isExpanded: boolean;
  ratings: Rating[];
  averageRating: number;
  createdAt: Date;
  updatedAt: Date;
  featured: boolean; // For homepage featured projects
  photosUrls: string[]
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
