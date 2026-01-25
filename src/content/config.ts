import { defineCollection, z } from 'astro:content';

const recipes = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		prep_time: z.string().optional(),
		cook_time: z.string().optional(),
		servings: z.union([z.string(), z.number()]).optional(),
		difficulty: z.string().optional(),
	}),
});

export const collections = { recipes };
