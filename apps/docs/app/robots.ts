import type { MetadataRoute } from 'next';

// search: an index may store the page.
// ai-input: an assistant may read the page to answer a question.
// ai-train: a model may train on the page. The docs are open source, so this is yes.
// use=full: an assistant may summarize and quote the page, not only link to it.
const contentSignal = 'search=yes, ai-input=yes, ai-train=yes, use=full';

// A crawler that finds its own name below uses that group and ignores `*`.
// The same permission has to be repeated on the named group.
// Names are the user-agent tokens from Cloudflare's AI bot list, plus
// Google-Extended and Applebot-Extended, which are training tokens rather
// than crawlers that show up in request logs.
// Cursor has no crawler name. It is covered by `*`.
const namedAgents = [
  'Googlebot',
  'Google-Extended',
  'Google-CloudVertexBot',
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'bingbot',
  'Bytespider',
  'CCBot',
  'meta-externalagent',
  'meta-externalfetcher',
  'FacebookBot',
  'Applebot',
  'Applebot-Extended',
  'Amazonbot',
  'DuckAssistBot',
  'MistralAI-User',
];

/**
 * Publish /robots.txt.
 *
 * Cloudflare serves a comment-only policy when the site has no robots.txt.
 * Some assistants treat that file as a block. This route replaces it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        other: { 'Content-Signal': contentSignal },
      },
      {
        userAgent: namedAgents,
        allow: '/',
        other: { 'Content-Signal': contentSignal },
      },
    ],
  };
}
