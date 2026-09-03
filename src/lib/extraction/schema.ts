import { z } from 'zod';
import { slugsFor, type BusinessCategory } from '@/lib/taxonomy/canonical-items';

export const DEAL_TYPES = ['fixed_price', 'percent_off', 'amount_off', 'bogo', 'bundle', 'free_item'] as const;
export const UNIT_KINDS = ['each', 'slice', 'lb', 'oz', 'kg', 'g', 'dozen', 'pack', 'gallon', 'liter', 'fl_oz'] as const;

/**
 * Structured-output schema for one capture. The canonical slug enum is narrowed to the
 * business category so the model can't pick a grocery item for a restaurant post.
 * Range checks (0..1 confidence, 0..6 weekdays) are enforced in postprocess, not here,
 * so the JSON schema stays within the structured-outputs subset.
 */
export function buildExtractionSchema(category: BusinessCategory) {
  const slugs = slugsFor(category) as [string, ...string[]];
  const Deal = z.object({
    title: z.string(),
    item_name: z.string(),
    canonical_item_slug: z.enum(slugs).nullable(),
    deal_type: z.enum(DEAL_TYPES),
    price: z.number().nullable(),
    regular_price: z.number().nullable(),
    percent_off: z.number().nullable(),
    quantity: z.number(),
    unit: z.enum(UNIT_KINDS),
    conditions: z.string().nullable(),
    starts_at: z.string().nullable(),
    ends_at: z.string().nullable(),
    days_of_week: z.array(z.number().int()).nullable(),
    time_window: z.string().nullable(),
    evidence_quote: z.string(),
    confidence: z.number(),
  });
  return z.object({
    deals: z.array(Deal),
    no_deal_reason: z.string().nullable(),
  });
}

export type ExtractionSchema = ReturnType<typeof buildExtractionSchema>;
export type ExtractionOutput = z.infer<ExtractionSchema>;
export type ExtractedDeal = ExtractionOutput['deals'][number];
