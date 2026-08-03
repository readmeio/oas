import dns from 'node:dns/promises';

import { isUnsafeURL } from '@readme/openapi-parser/lib/urls';

const MAX_REDIRECTS = 3;

function addressAsHttpUrl(address: string): string {
  return address.includes(':') ? `http://[${address}]/` : `http://${address}/`;
}

/**
 * Reject URLs whose hostname is private/loopback, or that DNS-resolve to a private address.
 *
 * The DNS check closes rebinding tricks (`127.0.0.1.nip.io`, etc.) that pass a sync hostname
 * check. In browsers we only have the sync check — there is no DNS API to consult.
 *
 */
export async function assertSafeURL(url: string): Promise<void> {
  if (isUnsafeURL(url)) {
    throw new Error(`Sorry, we cannot access ${url}.`);
  }

  let hostname: string;
  try {
    hostname = new URL(url.startsWith('//') ? `http:${url}` : url).hostname;
  } catch {
    throw new Error(`Sorry, we cannot access ${url}.`);
  }

  hostname = hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '');
  if (!hostname) {
    throw new Error(`Sorry, we cannot access ${url}.`);
  }

  // Literal IPs are already classified by the sync `isUnsafeURL()` check above.
  // Looking them up again is unnecessary and can fail in offline/test environments.
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
    return;
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isUnsafeURL(addressAsHttpUrl(address)))) {
      throw new Error(`Sorry, we cannot access ${url}.`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Sorry, we cannot access')) {
      throw err;
    }

    // If DNS fails we cannot prove the target is public — fail closed.
    // oxlint-disable-next-line preserve-caught-error -- @fixme we don't have access to ES2022 error typings here
    throw new Error(`Sorry, we cannot access ${url}.`);
  }
}

function withoutSensitiveHeaders(options: RequestInit): RequestInit {
  if (!options.headers) {
    return options;
  }

  const headers = new Headers(options.headers);
  headers.delete('authorization');
  headers.delete('proxy-authorization');
  headers.delete('cookie');
  return { ...options, headers };
}

/**
 * Fetch a URL after verifying it (and every redirect hop) does not target a private/internal
 * address. Unlike a bare `fetch()`, this will not follow a 30x from a public host onto IMDS /
 * loopback / RFC1918.
 *
 */
export async function fetchSafeURL(
  url: string,
  options: RequestInit = {},
  redirectsLeft: number = MAX_REDIRECTS,
): Promise<Response> {
  await assertSafeURL(url);

  const response = await fetch(url, { ...options, redirect: 'manual' });

  if (response.status >= 300 && response.status < 400) {
    if (redirectsLeft <= 0) {
      throw new Error(`Failed to fetch ${url}: too many redirects`);
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status} redirect with no location header`);
    }

    const redirectTo = new URL(location, url).toString();
    const nextOptions = new URL(redirectTo).origin === new URL(url).origin ? options : withoutSensitiveHeaders(options);

    return fetchSafeURL(redirectTo, nextOptions, redirectsLeft - 1);
  }

  return response;
}
