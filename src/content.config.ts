import {defineCollection,z} from 'astro:content';
import {glob} from 'astro/loaders';
import {topicSlugs} from './data/topics';

export const collections={articles:defineCollection({
  loader:glob({pattern:'**/*.md',base:'./src/content/articles'}),
  schema:z.object({
    title:z.string(),
    description:z.string(),
    publishedAt:z.coerce.date(),
    updatedAt:z.coerce.date().optional(),
    draft:z.boolean().default(false),
    tags:z.array(z.string()).default([]),
    topic:z.enum(topicSlugs),
    readingMinutes:z.number().int().positive().optional(),
    featured:z.boolean().default(false),
  }),
})};
