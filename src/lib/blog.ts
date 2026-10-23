// Blog posts by language, and the links between translations (SCRUM-34).
import { getCollection, type CollectionEntry } from 'astro:content';
import { blogPath, enabledLangs, isLang, splitPostId, type Lang } from '../config/i18n';

export type Post = CollectionEntry<'blog'>;

export interface PostInfo {
  post: Post;
  lang: Lang;
  slug: string;
  url: string;
}

function info(post: Post): PostInfo | undefined {
  const { lang, slug } = splitPostId(post.id);
  if (!isLang(lang) || !enabledLangs.includes(lang)) return undefined;
  return { post, lang, slug, url: blogPath(lang, slug) };
}

/** Published (non-draft) posts in enabled languages, newest first. */
export async function publishedPosts(lang?: Lang): Promise<PostInfo[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts
    .map(info)
    .filter((p): p is PostInfo => p !== undefined && (lang === undefined || p.lang === lang))
    .sort((a, b) => b.post.data.date.valueOf() - a.post.data.date.valueOf());
}

export { alternatesFor, type Alternate } from '../config/i18n';
