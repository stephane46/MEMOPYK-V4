import { createDirectus, rest, authentication } from '@directus/sdk';

interface Block {
  id: string;
  sort: number;
  block_type: string;
  content: any;
}

interface BlogPost {
  id: string;
  status: 'published' | 'draft' | 'archived';
  slug: string;
  title_en: string;
  title_fr: string;
  excerpt_en: string;
  excerpt_fr: string;
  featured_image: string | null;
  published_date: string;
  author: string | null;
  blocks: Block[];
  seo_title_en: string | null;
  seo_title_fr: string | null;
  seo_description_en: string | null;
  seo_description_fr: string | null;
  seo_keywords_en: string | null;
  seo_keywords_fr: string | null;
}

interface DirectusSchema {
  blog_posts: BlogPost[];
  blog_blocks: Block[];
}

const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'https://cms.memopyk.org';

const directus = createDirectus<DirectusSchema>(directusUrl)
  .with(rest())
  .with(authentication('json'));

export default directus;

export type { BlogPost, Block, DirectusSchema };
