import { createDirectus, rest, authentication } from '@directus/sdk';

interface Language {
  code: string;
  name: string;
}

interface Author {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface PostTranslation {
  id: string;
  posts_id: string;
  languages_code: string;
  title: string;
  excerpt: string;
  content?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
}

interface PostBlock {
  id: string;
  posts_id: string;
  sort: number;
  block_type: string;
  content: any;
}

interface Post {
  id: string;
  status: 'published' | 'draft' | 'archived';
  slug: string;
  featured_image?: string;
  published_date: string;
  author?: Author;
  category?: Category;
  tags?: Tag[];
  translations: PostTranslation[];
  blocks?: PostBlock[];
  view_count?: number;
  created_at: string;
  updated_at: string;
}

interface DirectusSchema {
  posts: Post[];
  post_translations: PostTranslation[];
  post_blocks: PostBlock[];
  authors: Author[];
  categories: Category[];
  tags: Tag[];
  languages: Language[];
}

const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'https://cms.memopyk.org';

const directus = createDirectus<DirectusSchema>(directusUrl)
  .with(rest())
  .with(authentication('json'));

export default directus;

export type { Post, PostTranslation, PostBlock, Author, Category, Tag, Language, DirectusSchema };
