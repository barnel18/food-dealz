import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { BusinessCategory } from '@/lib/taxonomy/canonical-items';
import { buildSystemPrompt, buildUserMessage } from './prompt';
import { buildExtractionSchema, type ExtractionOutput } from './schema';

export const DEFAULT_MODEL = 'claude-opus-5';
const MAX_TEXT_CHARS = 24_000;

export interface ExtractionInput {
  businessName: string;
  category: BusinessCategory;
  sourceType: string;
  sourceUrl: string | null;
  /** YYYY-MM-DD in the launch time zone. */
  captureDate: string;
  postedAt: string | null;
  /** Extra framing for special page kinds (chain offers pages). */
  pageHint?: string | null;
  text: string;
  imageUrls: string[];
}

export interface ExtractionUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface ExtractionResult {
  output: ExtractionOutput;
  model: string;
  usage: ExtractionUsage;
  usedImages: boolean;
}

export class ExtractionError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = 'ExtractionError';
  }
}


const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
type ImageMedia = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/** Download an image and wrap it as a base64 block; null when unavailable or too large. */
async function fetchImageBlock(url: string): Promise<Anthropic.Messages.ImageBlockParam | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36', Accept: 'image/*' },
    });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    const media: ImageMedia | null = ct === 'image/jpeg' || ct === 'image/png' || ct === 'image/gif' || ct === 'image/webp' ? ct : /\.(jpe?g)(\?|$)/i.test(url) ? 'image/jpeg' : null;
    if (!media) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
    return { type: 'image', source: { type: 'base64', media_type: media, data: buf.toString('base64') } };
  } catch {
    return null;
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

type Effort = 'low' | 'medium' | 'high';
function effort(): Effort {
  const e = process.env.EXTRACTION_EFFORT;
  return e === 'medium' || e === 'high' ? e : 'low';
}

/** One Claude call per capture: structured output validated against the category-specific schema. */
export async function extractDeals(input: ExtractionInput): Promise<ExtractionResult> {
  const text = input.text.slice(0, MAX_TEXT_CHARS);
  // Images cost input tokens; only send them when the text has no price to work from.
  const needsImages = !/[\d$]/.test(text) || text.trim().length < 40;
  const images = needsImages ? input.imageUrls.filter((u) => /^https?:\/\//.test(u)).slice(0, 2) : [];

  // Many CDNs (Instagram's included) block Anthropic's URL fetcher via robots.txt, so send bytes inline.
  const imageBlocks = (await Promise.all(images.map(fetchImageBlock))).filter((b): b is Anthropic.Messages.ImageBlockParam => b !== null);
  const content: Anthropic.Messages.ContentBlockParam[] = [{ type: 'text', text: buildUserMessage({ ...input, text }) }, ...imageBlocks];

  try {
    const res = await getClient().messages.parse({
      model: process.env.EXTRACTION_MODEL || DEFAULT_MODEL,
      max_tokens: 16384,
      system: [{ type: 'text', text: buildSystemPrompt(input.category), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content }],
      output_config: { format: zodOutputFormat(buildExtractionSchema(input.category)), effort: effort() },
    });
    if (res.stop_reason === 'refusal') throw new ExtractionError('model refused the request', false);
    if (res.stop_reason === 'max_tokens') throw new ExtractionError('output truncated (max_tokens)', false);
    const output = res.parsed_output;
    if (!output) throw new ExtractionError('output did not match schema', false);
    return {
      output,
      model: res.model,
      usage: {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
        cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: res.usage.cache_creation_input_tokens ?? 0,
      },
      usedImages: imageBlocks.length > 0,
    };
  } catch (e) {
    if (e instanceof ExtractionError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new ExtractionError(`rate limited: ${e.message}`, true);
    if (e instanceof Anthropic.AuthenticationError) throw new ExtractionError('invalid ANTHROPIC_API_KEY', false);
    if (e instanceof Anthropic.BadRequestError) throw new ExtractionError(`bad request: ${e.message}`, false);
    if (e instanceof Anthropic.APIError) throw new ExtractionError(`api error ${e.status}: ${e.message}`, (e.status ?? 500) >= 500);
    throw new ExtractionError(e instanceof Error ? e.message : String(e), true);
  }
}
