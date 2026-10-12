import {defineCollection,z} from 'astro:content';
import {glob} from 'astro/loaders';
export const collections={articles:defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/articles'}),schema:z.object({title:z.string(),description:z.string(),publishedAt:z.coerce.date(),draft:z.boolean().default(false),tags:z.array(z.string()).default([])})})};
