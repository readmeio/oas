import type { Parent, Node } from 'unist';

import { fromMarkdown } from 'mdast-util-from-markdown';
import fetch from 'node-fetch';
import { find } from 'unist-util-find';
import { findAfter } from 'unist-util-find-after';
import flatFilter from 'unist-util-flat-filter';

// Core Resource - Sourcing headers directly from MDN
export const sourceUrl = 'https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/http/headers/index.md';
// Store MDN response in memory for future lookups
let markdown: string;
// Store previously looked-up header descriptions in memory
const cachedHTTPHeaders: Record<string, string> = {};

/**
 * Fetch MDN HTTP Header source markdown.
 */
export const retrieveMarkdown = (): Promise<string> => {
  return fetch(sourceUrl).then(res => {
    if (!res.ok) throw new Error('Failed to fetch markdown.');
    return res.text();
  });
};

/**
 * Normalizes and converts a header into markdown-representative identifier
 * @example
 * normalizeHeader('content-length') -> '{{HTTPHeader("content-length")}}'
 */
export const normalizeHeader = (header: string): string => `{{HTTPHeader("${header}")}}`.toLowerCase();

/**
 * Builds complete HTTP header description
 * Full description may be multi-line. Ensure we've captured complete text before returning.
 */
export const buildDescription = (tree: Parent, headerNode: ChildTextNode): string => {
  let description = '';
  let currentNode = headerNode;

  while (!description.endsWith('.')) {
    currentNode = findAfter(tree, currentNode, { type: 'text' }) as ChildTextNode;
    if (currentNode?.value) {
      const [fallback, text] = currentNode.value.split(': ') ?? [];
      description = description.concat(text || fallback || '');
    }
  }

  return description;
};

/**
 * Interpolates description string content
 * @example
 * interpolateDescription('{{Glossary("MIME_type", "types")}}') => 'types'
 */
export const interpolateDescription = (description: string): string => {
  // i.e. '{{Glossary("effective connection type")}}'
  const simpleGlossaryRegexp = /\{\{Glossary\("([^"]+)"?\)\}\}/g;
  // i.e. '{{Glossary("MIME_type", "types")}}'
  const compoundGlossaryRegexp = /\{\{Glossary\("([^"]+)", "([^"]+)"\)\}\}/g;

  // Prematurely return if nothing to process
  if (!description) return description;

  if (description.match(simpleGlossaryRegexp)) return description.split(simpleGlossaryRegexp).join('');

  if (description.match(compoundGlossaryRegexp)) {
    const [start, , interpolation, end] = description.split(compoundGlossaryRegexp);
    return `${start}${interpolation}${end}`;
  }

  return description;
};

interface ChildTextNode extends Node {
  value?: string;
}

/**
 * Performs lookup in MDN HTTP Header markdown for target header.
 * Returns a description, if found.
 */
export const searchHeaderDescription = (tree: Parent, header: string): string => {
  if (tree && header) {
    const headerNode = find(tree as any, (node: ChildTextNode) => {
      return (
        (node.value?.toLowerCase().includes(normalizeHeader(header)) && node.position?.start.column === 3) || false
      );
    });

    if (headerNode) {
      const description = buildDescription(tree, headerNode);
      return interpolateDescription(description);
    }
  }
  return '';
};

/**
 * Performs lookup in MDN HTTP Header markdown for target list of HTTP headers.
 */
export default async function getHeaderDescription(header: string | string[]): Promise<Record<string, string>> {
  try {
    // If markdown has not been requested and cached, do so now
    if (!markdown) markdown = await retrieveMarkdown();

    // Convert text -> markdown syntax tree
    const mdast = fromMarkdown(markdown, 'utf-8') as any;
    // Flatten tree for easy value enumeration
    const tree = flatFilter(mdast, node => node?.type === 'text') as Parent;
    // Convert args into a unified format
    const headers = Array.isArray(header) ? header : [header];

    // Process headers and apply found descriptions
    return headers.reduce(
      (acc, h) => {
        if (cachedHTTPHeaders[h]) {
          acc[h] = cachedHTTPHeaders[h];
        } else {
          const description = searchHeaderDescription(tree, h);
          cachedHTTPHeaders[h] = description;
          acc[h] = description;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  } catch (e) {
    return {};
  }
}
