
import { z } from 'zod';

// Define input and output schemas
export const SendNewsletterInputSchema = z.enum(['menu_1', 'menu_2']);
export type SendNewsletterInput = z.infer<typeof SendNewsletterInputSchema>;

export const SendNewsletterOutputSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  message: z.string(),
  subject: z.string().optional(),
  body: z.string().optional(),
});
export type SendNewsletterOutput = z.infer<typeof SendNewsletterOutputSchema>;

// Define the Zod schema for menu data for validation and type inference
export const MenuSectionSchema = z.object({
    title: z.string(),
    lines: z.array(z.string()),
    isVisible: z.boolean(),
});
export type MenuSection = z.infer<typeof MenuSectionSchema>;


export const MenuDataSchema = z.object({
    id: z.string(),
    image: z.string().url(),
    date: z.string(),
    horaires: z.string(),
    sections: z.array(MenuSectionSchema),
    footerLines: z.array(z.string()),
});
export type MenuData = z.infer<typeof MenuDataSchema>;
