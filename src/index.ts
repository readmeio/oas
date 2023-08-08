import type { Parent, Node } from 'unist';

import { fromMarkdown } from 'mdast-util-from-markdown';
import fetch from 'node-fetch';
import { find } from 'unist-util-find';
import { findAfter } from 'unist-util-find-after';
import flatFilter from 'unist-util-flat-filter';

const sourceUrl = 'https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/http/headers/index.md';
let markdown: string;

interface ChildTextNode extends Node {
  value: string;
}

export async function retrieveMarkdown() {
  try {
    const response = await fetch(sourceUrl);
    markdown = await response.text();
  } catch (e) {
    return '';
  }

  return markdown;
}

export const normalizeHeader = (value: string) => {
  const normalizedValue = value
    .split('-')
    .map(v => v.charAt(0).toUpperCase() + v.slice(1))
    .join('-');

  return `{{HTTPHeader("${normalizedValue}")}}`;
};

export const searchHeaderDescription = (tree: Parent, value: string) => {
  if (tree && value) {
    const headerNode = find(tree as any, { value: normalizeHeader(value) });

    if (headerNode) {
      const descriptionNode = findAfter(tree, headerNode, { type: 'text' }) as ChildTextNode;
      if (descriptionNode?.value) return descriptionNode.value.split(': ')?.[1];
    }
  }
  return '';
};

export default async function getHeaderDescription(header: string | string[]) {
  try {
    if (!markdown) await retrieveMarkdown();

    const mdast = fromMarkdown(markdown, 'utf-8') as any;
    const tree = flatFilter(mdast, node => node?.type === 'text') as Parent;

    const headers = Array.isArray(header) ? header : [header];
    return headers.reduce((acc, h) => {
      acc[h] = searchHeaderDescription(tree, h);
      return acc;
    }, {} as Record<string, string>);
  } catch (e) {
    return {};
  }
}
