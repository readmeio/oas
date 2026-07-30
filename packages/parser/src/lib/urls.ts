import { isUnsafeUrl } from '@apidevtools/json-schema-ref-parser';

// Matches a URL scheme (e.g. `https:`, `javascript:`, `file:`), per RFC 3986. Used to
// distinguish absolute URLs from relative filesystem paths and JSON pointers.
const schemePattern = /^[a-z][a-z\d+.-]*:/i;

// Matches `<scheme>://<authority>` so we can inspect (and, if necessary, fix up) the authority
// component before handing the URL off to `isUnsafeUrl()`.
const schemeAuthorityPattern = /^([a-z][a-z\d+.-]*:\/\/)([^[/?#]*)([/?#].*)?$/i;

/**
 * `isUnsafeUrl()` fails to recognize a bare (unbracketed) IPv6 literal, like `fe80::1`, as a
 * hostname: its regex-based fallback for URLs that don't successfully parse via the `URL`
 * constructor mistakes the address's trailing `:<hex group>` for a port number and strips it,
 * corrupting the address before it can be checked against the private/loopback IPv6 ranges.
 *
 * Wrapping the authority in `[...]`, as RFC 3986 requires for IPv6 literals, lets it parse
 * successfully instead, taking it through `isUnsafeUrl()`'s real (correct) IPv6 handling.
 */
function bracketBareIPv6Authority(url: string): string {
  const match = schemeAuthorityPattern.exec(url);
  if (!match) {
    return url;
  }

  const [, prefix, authority, rest = ''] = match;

  // A `host:port` pair has exactly one colon; an IPv6 literal always has two or more.
  if ((authority.match(/:/g) || []).length >= 2) {
    return `${prefix}[${authority}]${rest}`;
  }

  return url;
}

/**
 * Determine if a given URL is unsafe.
 *
 * An unsafe URL is one that is not publicly accessible (no private IPs, private ports, etc.)
 *
 */
export function isUnsafeURL(url: string): boolean {
  if (typeof url !== 'string') {
    return isUnsafeUrl(url);
  }

  const trimmed = url.trim();

  // A string with no URL scheme and no leading `//` is a relative filesystem path or
  // in-document JSON pointer (e.g. `./schemas/pet.json`, `../schemas/pet.json`,
  // `#/definitions/pet`), not a network location, so it's always safe.
  //
  // We need to special-case this because `isUnsafeUrl()` misclassifies any relative path
  // containing a lone `.` or `..` segment as unsafe: its hostname-safety check normalizes
  // those segments down to an empty string, which it then treats as an unsafe hostname.
  if (trimmed !== '' && !trimmed.startsWith('//') && !schemePattern.test(trimmed)) {
    return false;
  }

  return isUnsafeUrl(bracketBareIPv6Authority(trimmed));
}
