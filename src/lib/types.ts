export interface Category {
  id: string
  name: string
  slug: string
  sortOrder: number
  works?: Work[]
}

export interface Work {
  id: string
  title: string
  description: string | null
  imageUrl: string
  thumbnailUrl: string | null
  categoryId: string
  category?: Category
  tags: string | null
  featured: boolean
  sortOrder: number
  createdAt: string
}

export interface SiteSettings {
  id: string
  siteName: string
  tagline: string | null
  avatarUrl: string | null
  bio: string | null
}