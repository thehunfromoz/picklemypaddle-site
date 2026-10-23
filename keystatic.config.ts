// Keystatic blog editor (SCRUM-34). Used ONLY by the editor build (astro.editor.config.mjs,
// Dockerfile.editor), which runs on staging behind Tailscale. The public site build
// (astro.config.mjs) never loads this file, so the live site has no /keystatic route.
//
// Storage is GitHub: the editor reads and writes this repo through a GitHub App limited to
// picklemypaddle-site. `main` is protected, so posts are saved on a `blog/...` branch and
// published by opening a pull request from the editor and merging it: CI and branch
// protection apply exactly as for code.
//
// The fields match src/lib/blog-schema.ts; tests/unit/keystatic-config.test.ts checks they agree.
import { collection, config, fields } from '@keystatic/core';
import { enabledLangs, languages, type Lang } from './src/config/i18n';

// Images are stored next to the site's other images, one folder per post, and referenced
// relative to src/content/blog/<lang>/<slug>.md so Astro optimises them.
const images = { directory: 'src/assets/images/blog', publicPath: '../../../assets/images/blog/' };

const posts = (lang: Lang) =>
  collection({
    label: `Blog (${languages[lang].label})`,
    path: `src/content/blog/${lang}/*`,
    slugField: 'title',
    format: { contentField: 'body' },
    entryLayout: 'content',
    columns: ['title', 'date'],
    schema: {
      title: fields.slug({
        name: { label: 'Title', validation: { length: { min: 1 } } },
        slug: {
          label: 'Web address',
          description: 'The end of the post URL, /blog/<this>. Changing it later breaks old links.',
        },
      }),
      seoTitle: fields.text({
        label: 'Short title for search results (optional)',
        description: 'Only needed when the title is longer than 43 characters.',
        validation: { length: { max: 43 } },
      }),
      description: fields.text({
        label: 'Summary',
        description: 'One or two sentences. Shown on the blog page, in search results and in the RSS feed.',
        multiline: true,
        validation: { length: { min: 1, max: 160 } },
      }),
      date: fields.date({ label: 'Date', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
      author: fields.text({ label: 'Author', defaultValue: 'PickleMyPaddle' }),
      tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags', itemLabel: (props) => props.value }),
      cover: fields.image({ label: 'Cover image (optional)', ...images }),
      coverAlt: fields.text({
        label: 'Cover image description (alt text)',
        description: 'Required when there is a cover image: say what it shows, for people using screen readers.',
      }),
      draft: fields.checkbox({
        label: 'Draft',
        description: 'Drafts are kept in the repo but not shown on the site.',
        defaultValue: false,
      }),
      body: fields.markdoc({
        label: 'Body',
        extension: 'md',
        options: { image: images },
      }),
    },
  });

export default config({
  storage: {
    kind: 'github',
    repo: { owner: 'thehunfromoz', name: 'picklemypaddle-site' },
    branchPrefix: 'blog/',
  },
  ui: { brand: { name: 'PickleMyPaddle blog' } },
  collections: Object.fromEntries(enabledLangs.map((lang) => [`blog-${lang}`, posts(lang)])),
});
