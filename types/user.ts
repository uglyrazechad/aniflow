export interface Profile {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  /** Ключ пресета фона из lib/profile-themes.ts либо прямой URL картинки. */
  background: string;
  accent: string;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  createdAt: number;
  profile: Profile;
}

export interface FavoriteEntry {
  id: string;
  title: string;
  posterUrl?: string;
  year?: number;
  rating?: number;
  addedAt: number;
}
