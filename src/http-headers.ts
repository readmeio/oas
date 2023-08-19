import type { HTTPHeader, HTTPHeaderDescription } from './types';

const HTTPHeaders: Record<HTTPHeader, HTTPHeaderDescription> = {
  Accept: {
    description: 'Informs the server about the types of data that can be sent back.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept',
  },
  'Accept-CH': {
    experimental: true,
    description:
      'Servers can advertise support for Client Hints using the Accept-CH header field or an equivalent HTML <meta> element with http-equiv attribute.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-CH',
    markdown:
      'Servers can advertise support for Client Hints using the `Accept-CH` header field or an equivalent HTML `<meta>` element with [`http-equiv`](/en-US/docs/Web/HTML/Element/meta#http-equiv) attribute.',
  },
  'Accept-CH-Lifetime': {
    experimental: true,
    deprecated: true,
    description:
      "Servers can ask the client to remember the set of Client Hints that the server supports for a specified period of time, to enable delivery of Client Hints on subsequent requests to the server's origin.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-CH-Lifetime',
  },
  'Accept-Encoding': {
    description: 'The encoding algorithm, usually a compression algorithm, that can be used on the resource sent back.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding',
    markdown:
      'The encoding algorithm, usually a [compression algorithm](/en-US/docs/Web/HTTP/Compression), that can be used on the resource sent back.',
  },
  'Accept-Language': {
    description:
      'Informs the server about the human language the server is expected to send back. This is a hint and is not necessarily under the full control of the user: the server should always pay attention not to override an explicit user choice (like selecting a language from a dropdown).',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language',
  },
  'Accept-Push-Policy': {
    experimental: true,
    description:
      'A client can express the desired push policy for a request by sending an Accept-Push-Policy header field in the request.',
    link: '',
    markdown:
      'A client can express the desired push policy for a request by sending an [`Accept-Push-Policy`](https://datatracker.ietf.org/doc/html/draft-ruellan-http-accept-push-policy-00#section-3.1) header field in the request.',
  },
  'Accept-Ranges': {
    description: 'Indicates if the server supports range requests, and if so in which unit the range can be expressed.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Ranges',
  },
  'Accept-Signature': {
    experimental: true,
    description:
      'A client can send the "Accept-Signature" header field to indicate intention to take advantage of any available signatures and to indicate what kinds of signatures it supports.',
    link: '',
    markdown:
      'A client can send the [`Accept-Signature`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html#rfc.section.3.7) header field to indicate intention to take advantage of any available signatures and to indicate what kinds of signatures it supports.',
  },
  'Access-Control-Allow-Origin': {
    description: 'Indicates whether the response can be shared.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin',
  },
  'Access-Control-Allow-Credentials': {
    description: 'Indicates whether the response to the request can be exposed when the credentials flag is true.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials',
  },
  'Access-Control-Allow-Headers': {
    description:
      'Used in response to a preflight request to indicate which HTTP headers can be used when making the actual request.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers',
  },
  'Access-Control-Allow-Methods': {
    description: 'Specifies the methods allowed when accessing the resource in response to a preflight request.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Methods',
  },
  'Access-Control-Expose-Headers': {
    description: 'Indicates which headers can be exposed as part of the response by listing their names.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Expose-Headers',
  },
  'Access-Control-Max-Age': {
    description: 'Indicates how long the results of a preflight request can be cached.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age',
  },
  'Access-Control-Request-Headers': {
    description:
      'Used when issuing a preflight request to let the server know which HTTP headers will be used when the actual request is made.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Request-Headers',
  },
  'Access-Control-Request-Method': {
    description:
      'Used when issuing a preflight request to let the server know which HTTP method will be used when the actual request is made.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Request-Method',
    markdown:
      'Used when issuing a preflight request to let the server know which [HTTP method](/en-US/docs/Web/HTTP/Methods) will be used when the actual request is made.',
  },
  Age: {
    description: 'The time, in seconds, that the object has been in a proxy cache.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Age',
  },
  Allow: {
    description: 'Lists the set of HTTP request methods supported by a resource.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Allow',
  },
  'Alt-Svc': {
    description: 'Used to list alternate ways to reach this service.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Alt-Svc',
  },
  'Alt-Used': {
    description: 'Used to identify the alternative service in use.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Alt-Used',
  },
  Authorization: {
    description: 'Contains the credentials to authenticate a user-agent with a server.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization',
  },
  'Cache-Control': {
    description: 'Directives for caching mechanisms in both requests and responses.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control',
  },
  'Clear-Site-Data': {
    description: 'Clears browsing data (e.g. cookies, storage, cache) associated with the requesting website.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Clear-Site-Data',
  },
  Connection: {
    description: 'Controls whether the network connection stays open after the current transaction finishes.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Connection',
  },
  Cookie: {
    description: 'Contains stored HTTP cookies previously sent by the server with the Set-Cookie header.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie',
    markdown:
      'Contains stored [HTTP cookies](/en-US/docs/Web/HTTP/Cookies) previously sent by the server with the "Set-Cookie" header.',
  },
  'Content-Encoding': {
    description: 'Used to specify the compression algorithm.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Encoding',
  },
  'Content-Disposition': {
    description:
      'Indicates if the resource transmitted should be displayed inline (default behavior without the header), or if it should be handled like a download and the browser should present a "Save As" dialog.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition',
  },
  'Content-DPR': {
    deprecated: true,
    experimental: true,
    description:
      'Response header used to confirm the image device to pixel ratio in requests where the DPR client hint was used to select an image resource.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-DPR',
    markdown:
      '_Response header_ used to confirm the image device to pixel ratio in requests where the "DPR" client hint was used to select an image resource.',
  },
  'Content-Language': {
    description:
      "Describes the human language(s) intended for the audience, so that it allows a user to differentiate according to the users' own preferred language.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Language',
  },
  'Content-Length': {
    description: 'The size of the resource, in decimal number of bytes.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Length',
  },
  'Content-Location': {
    description: 'Indicates an alternate location for the returned data.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Location',
  },
  'Content-Range': {
    description: 'Indicates where in a full body message a partial message belongs.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range',
  },
  'Content-Type': {
    description: 'Indicates the media type of the resource.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type',
  },
  'Content-Security-Policy': {
    description: 'Controls resources the user agent is allowed to load for a given page.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy',
  },
  'Content-Security-Policy-Report-Only': {
    description:
      'Allows web developers to experiment with policies by monitoring, but not enforcing, their effects. These violation reports consist of JSON documents sent via an HTTP POST request to the specified URI.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only',
    markdown:
      'Allows web developers to experiment with policies by monitoring, but not enforcing, their effects. These violation reports consist of JSON documents sent via an HTTP `POST` request to the specified URI.',
  },
  'Critical-CH': {
    experimental: true,
    description:
      'Servers use Critical-CH along with Accept-CH to specify that accepted client hints are also critical client hints.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Critical-CH',
    markdown:
      'Servers use `Critical-CH` along with "Accept-CH" to specify that accepted client hints are also [critical client hints](/en-US/docs/Web/HTTP/Client_hints#critical_client_hints).',
  },
  'Cross-Origin-Embedder-Policy': {
    description: 'Allows a server to declare an embedder policy for a given document.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy',
  },
  'Cross-Origin-Opener-Policy': {
    description: 'Prevents other domains from opening/controlling a window.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy',
  },
  'Cross-Origin-Resource-Policy': {
    description: ' Prevents other domains from reading the response of the resources to which this header is applied.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy',
  },
  Date: {
    description: 'Contains the date and time at which the message was originated.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Date',
  },
  'Device-Memory': {
    deprecated: true,
    experimental: true,
    description: ' Approximate amount of available client RAM memory. This is part of the Device Memory API.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Device-Memory',
    markdown:
      'Approximate amount of available client RAM memory. This is part of the [Device Memory API](/en-US/docs/Web/API/Device_Memory_API).',
  },
  Downlink: {
    description:
      "Approximate bandwidth of the client's connection to the server, in Mbps. This is part of the Network Information API.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Downlink',
    markdown:
      "Approximate bandwidth of the client's connection to the server, in Mbps. This is part of the [Network Information API](/en-US/docs/Web/API/Network_Information_API).",
  },
  DPR: {
    deprecated: true,
    experimental: true,
    description:
      'Client device pixel ratio (DPR), which is the number of physical device pixels corresponding to every CSS pixel.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/DPR',
  },
  'Early-Data': {
    experimental: true,
    description: 'Indicates that the request has been conveyed in TLS early data.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Early-Data',
  },
  ECT: {
    description:
      'The effective connection type ("network profile") that best matches the connection\'s latency and bandwidth. This is part of the Network Information API.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ECT',
    markdown:
      'The "network profile" that best matches the connection\'s latency and bandwidth. This is part of the [Network Information API](/en-US/docs/Web/API/Network_Information_API).',
  },
  ETag: {
    description:
      'A unique string identifying the version of the resource. Conditional requests using If-Match and If-None-Match use this value to change the behavior of the request.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag',
  },
  Expect: {
    description: 'Indicates expectations that need to be fulfilled by the server to properly handle the request.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Expect',
  },
  'Expect-CT': {
    deprecated: true,
    description:
      'Allows sites to opt in to reporting and/or enforcement of Certificate Transparency requirements, which prevents the use of misissued certificates for that site from going unnoticed. When a site enables the Expect-CT header, they are requesting that Chrome check that any certificate for that site appears in public CT logs.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Expect-CT',
  },
  Expires: {
    description: 'The date/time after which the response is considered stale.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Expires',
  },
  Forwarded: {
    description:
      ' Contains information from the client-facing side of proxy servers that is altered or lost when a proxy is involved in the path of the request.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded',
  },
  From: {
    description: 'Contains an Internet email address for a human user who controls the requesting user agent.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/From',
  },
  Host: {
    description:
      'Specifies the domain name of the server (for virtual hosting), and (optionally) the TCP port number on which the server is listening.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Host',
  },
  'If-Match': {
    description:
      'Makes the request conditional, and applies the method only if the stored resource matches one of the given ETags.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Match',
  },
  'If-Modified-Since': {
    description:
      'Makes the request conditional, and expects the resource to be transmitted only if it has been modified after the given date. This is used to transmit data only when the cache is out of date.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Modified-Since',
  },
  'If-None-Match': {
    description:
      "Makes the request conditional, and applies the method only if the stored resource _doesn't_ match any of the given ETags. This is used to update caches (for safe requests), or to prevent uploading a new resource when one already exists.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match',
  },
  'If-Range': {
    description:
      'Creates a conditional range request that is only fulfilled if the given etag or date matches the remote resource. Used to prevent downloading two ranges from incompatible version of the resource.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Range',
  },
  'If-Unmodified-Since': {
    description:
      'Makes the request conditional, and expects the resource to be transmitted only if it has not been modified after the given date. This ensures the coherence of a new fragment of a specific range with previous ones, or to implement an optimistic concurrency control system when modifying existing documents.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Unmodified-Since',
  },
  'Keep-Alive': {
    description: 'Controls how long a persistent connection should stay open.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Keep-Alive',
  },
  'Large-Allocation': {
    deprecated: true,
    description: 'Tells the browser that the page being loaded is going to want to perform a large allocation.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Large-Allocation',
  },
  'Last-Modified': {
    description:
      'The last modification date of the resource, used to compare several versions of the same resource. It is less accurate than "ETag", but easier to calculate in some environments. Conditional requests using "If-Modified-Since" and "If-Unmodified-Since" use this value to change the behavior of the request.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Last-Modified',
  },
  Link: {
    description:
      'The "Link" entity-header field provides a means for serializing one or more links in HTTP headers. It is semantically equivalent to the HTML link element.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link',
    markdown:
      'The [`Link`](https://datatracker.ietf.org/doc/html/rfc5988#section-5) entity-header field provides a means for serializing one or more links in HTTP headers. It is semantically equivalent to the HTML link element.',
  },
  Location: {
    description: 'Indicates the URL to redirect a page to.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location',
  },
  'Max-Forwards': {
    description:
      'When using TRACE, indicates the maximum number of hops the request can do before being reflected to the sender.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Max-Forwards',
    markdown:
      'When using [`TRACE`](/en-US/docs/Web/HTTP/Methods/TRACE), indicates the maximum number of hops the request can do before being reflected to the sender.',
  },
  NEL: {
    description: 'Defines a mechanism that enables developers to declare a network error reporting policy.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/NEL',
  },
  Origin: {
    description: 'Indicates where a fetch originates from.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin',
  },
  'Origin-Isolation': {
    experimental: true,
    description: 'Provides a mechanism to allow web applications to isolate their origins.',
    link: '',
  },
  'Permissions-Policy': {
    description:
      "Provides a mechanism to allow and deny the use of browser features in a website's own frame, and in iframes that it embeds.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy',
  },
  Pragma: {
    deprecated: true,
    description:
      'Implementation-specific header that may have various effects anywhere along the request-response chain. Used for backwards compatibility with HTTP/1.0 caches where the Cache-Control header is not yet present.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Pragma',
    markdown:
      'Implementation-specific header that may have various effects anywhere along the request-response chain. Used for backwards compatibility with HTTP/1.0 caches where the `Cache-Control` header is not yet present.',
  },
  'Proxy-Authenticate': {
    description: 'Defines the authentication method that should be used to access a resource behind a proxy server.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Proxy-Authenticate',
  },
  'Proxy-Authorization': {
    description: 'Contains the credentials to authenticate a user agent with a proxy server.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Proxy-Authorization',
  },
  'Push-Policy': {
    experimental: true,
    description: 'A Push-Policy defines the server behavior regarding push when processing a request.',
    link: '',
    markdown:
      'A [`Push-Policy`](https://datatracker.ietf.org/doc/html/draft-ruellan-http-accept-push-policy-00#section-3.2) defines the server behavior regarding push when processing a request.',
  },
  Range: {
    description: 'Indicates the part of a document that the server should return.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range',
  },
  Referer: {
    description: 'The address of the previous web page from which a link to the currently requested page was followed.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referer',
  },
  'Referrer-Policy': {
    description: 'Governs which referrer information sent in the Referer header should be included with requests made.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy',
  },
  Refresh: {
    description:
      'Directs the browser to reload the page or redirect to another. Takes the same value as the meta element with http-equiv="refresh".',
    link: '',
    markdown:
      'Directs the browser to reload the page or redirect to another. Takes the same value as the `meta` element with [`http-equiv="refresh"`](/en-US/docs/Web/HTML/Element/meta#http-equiv).',
  },
  'Report-To': {
    description: 'Used to specify a server endpoint for the browser to send warning and error reports to.',
    link: '',
  },
  'Retry-After': {
    description: 'Indicates how long the user agent should wait before making a follow-up request.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After',
  },
  RTT: {
    description:
      'Application layer round trip time (RTT) in milliseconds, which includes the server processing time. This is part of the Network Information API.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/RTT',
    markdown:
      'Application layer round trip time (RTT) in milliseconds, which includes the server processing time. This is part of the [Network Information API](/en-US/docs/Web/API/Network_Information_API).',
  },
  'Save-Data': {
    experimental: true,
    description: "A boolean that indicates the user agent's preference for reduced data usage.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Save-Data',
  },
  'Sec-CH-Prefers-Reduced-Motion': {
    experimental: true,
    description: "User agent's reduced motion preference setting.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Reduced-Motion',
  },
  'Sec-CH-UA': {
    experimental: true,
    description: "User agent's branding and version.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA',
  },
  'Sec-CH-UA-Arch': {
    experimental: true,
    description: "User agent's underlying platform architecture.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Arch',
  },
  'Sec-CH-UA-Bitness': {
    experimental: true,
    description: 'User agent\'s underlying CPU architecture bitness (for example "64" bit).',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Bitness',
  },
  'Sec-CH-UA-Full-Version': {
    description: "User agent's full semantic version string.",
    deprecated: true,
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Full-Version',
  },
  'Sec-CH-UA-Full-Version-List': {
    experimental: true,
    description: "Full version for each brand in the user agent's brand list.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Full-Version-List',
  },
  'Sec-CH-UA-Mobile': {
    experimental: true,
    description: 'User agent is running on a mobile device or, more generally, prefers a "mobile" user experience.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Mobile',
  },
  'Sec-CH-UA-Model': {
    experimental: true,
    description: "User agent's device model.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Model',
  },
  'Sec-CH-UA-Platform': {
    experimental: true,
    description: " User agent's underlying operation system/platform.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Platform',
  },
  'Sec-CH-UA-Platform-Version': {
    experimental: true,
    description: "User agent's underlying operation system version.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Platform-Version',
  },
  'Sec-Fetch-Dest': {
    description:
      'Indicates the request\'s destination. It is a Structured Header whose value is a token with possible values "audio", "audioworklet", "document", "embed", "empty", "font", "image", "manifest", "object", "paintworklet", "report", "script", "serviceworker", "sharedworker", "style", "track", "video", "worker", and "xslt".',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-Fetch-Dest',
    markdown:
      "Indicates the request's destination. It is a Structured Header whose value is a token with possible values `audio`, `audioworklet`, `document`, `embed`, `empty`, `font`, `image`, `manifest`, `object`, `paintworklet`, `report`, `script`, `serviceworker`, `sharedworker`, `style`, `track`, `video`, `worker`, and `xslt`.",
  },
  'Sec-Fetch-Mode': {
    description:
      'Indicates the request\'s mode to a server. It is a Structured Header whose value is a token with possible values "cors", "navigate", "no-cors", "same-origin", and "websocket".',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-Fetch-Mode',
    markdown:
      "Indicates the request's mode to a server. It is a Structured Header whose value is a token with possible values `cors`, `navigate`, `no-cors`, `same-origin`, and `websocket`.",
  },
  'Sec-Fetch-Site': {
    description:
      ' Indicates the relationship between a request initiator\'s origin and its target\'s origin. It is a Structured Header whose value is a token with possible values "cross-site", "same-origin", "same-site", and "none".',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-Fetch-Site',
    markdown:
      "Indicates the relationship between a request initiator's origin and its target's origin. It is a Structured Header whose value is a token with possible values `cross-site`, `same-origin`, `same-site`, and `none`.",
  },
  'Sec-Fetch-User': {
    description:
      'Indicates whether or not a navigation request was triggered by user activation. It is a Structured Header whose value is a boolean so possible values are "?0" for false and "?1" for true.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-Fetch-User',
    markdown:
      'Indicates whether or not a navigation request was triggered by user activation. It is a Structured Header whose value is a boolean so possible values are `?0` for false and `?1` for true.',
  },
  'Sec-Purpose': {
    experimental: true,
    description:
      'Indicates the purpose of the request, when the purpose is something other than immediate use by the user-agent. The header currently has one possible value, "prefetch", which indicates that the resource is being fetched preemptively for a possible future navigation.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-Purpose',
    markdown:
      'Indicates the purpose of the request, when the purpose is something other than immediate use by the user-agent. The header currently has one possible value, `prefetch`, which indicates that the resource is being fetched preemptively for a possible future navigation.',
  },
  Server: {
    description: 'Contains information about the software used by the origin server to handle the request.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server',
  },
  'Server-Timing': {
    description: 'Communicates one or more metrics and descriptions for the given request-response cycle.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing',
  },
  'Service-Worker-Allowed': {
    description:
      'Used to remove the path restriction by including this header in the response of the Service Worker script.',
    link: '',
    markdown:
      'Used to remove the [path restriction](https://w3c.github.io/ServiceWorker/#path-restriction) by including this header [in the response of the Service Worker script](https://w3c.github.io/ServiceWorker/#service-worker-script-response).',
  },
  'Service-Worker-Navigation-Preload': {
    description:
      'A request header sent in preemptive request to fetch a resource during service worker boot. The value, which is set with NavigationPreloadManager.setHeaderValue(), can be used to inform a server that a different resource should be returned than in a normal fetch operation.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Service-Worker-Navigation-Preload',
    markdown:
      'A request header sent in preemptive request to `fetch()` a resource during service worker boot. The value, which is set with `NavigationPreloadManager.setHeaderValue()`, can be used to inform a server that a different resource should be returned than in a normal `fetch()` operation.',
  },
  'Set-Cookie': {
    description: 'Send cookies from the server to the user-agent.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie',
  },
  Signature: {
    experimental: true,
    description:
      'The "Signature" header field conveys a list of signatures for an exchange, each one accompanied by information about how to determine the authority of and refresh that signature.',
    link: '',
    markdown:
      'The [`Signature`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html#rfc.section.3.1) header field conveys a list of signatures for an exchange, each one accompanied by information about how to determine the authority of and refresh that signature.',
  },
  'Signed-Headers': {
    experimental: true,
    description:
      'The "Signed-Headers" header field identifies an ordered list of response header fields to include in a signature.',
    link: '',
    markdown:
      'The [`Signed-Headers`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html#rfc.section.5.1.2) header field identifies an ordered list of response header fields to include in a signature.',
  },
  SourceMap: {
    description: 'Links generated code to a source map.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/SourceMap',
    markdown:
      'Links generated code to a [source map](https://firefox-source-docs.mozilla.org/devtools-user/debugger/how_to/use_a_source_map/index.html).',
  },
  'Strict-Transport-Security': {
    description: 'Force communication using HTTPS instead of HTTP.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
  },
  TE: {
    description: 'Specifies the transfer encodings the user agent is willing to accept.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/TE',
  },
  'Timing-Allow-Origin': {
    description:
      'Specifies origins that are allowed to see values of attributes retrieved via features of the Resource Timing API, which would otherwise be reported as zero due to cross-origin restrictions.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Timing-Allow-Origin',
    markdown:
      'Specifies origins that are allowed to see values of attributes retrieved via features of the [Resource Timing API](/en-US/docs/Web/API/Performance_API/Resource_timing), which would otherwise be reported as zero due to cross-origin restrictions.',
  },
  Trailer: {
    description: 'Allows the sender to include additional fields at the end of chunked message.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Trailer',
  },
  'Transfer-Encoding': {
    description: 'Specifies the form of encoding used to safely transfer the resource to the user.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Transfer-Encoding',
  },
  Upgrade: {
    description:
      'The standard establishes rules for upgrading or changing to a different protocol on the current client, server, transport protocol connection. For example, this header standard allows a client to change from HTTP 1.1 to WebSocket, assuming the server decides to acknowledge and implement the Upgrade header field. Neither party is required to accept the terms specified in the Upgrade header field. It can be used in both client and server headers. If the Upgrade header field is specified, then the sender MUST also send the Connection header field with the upgrade option specified.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Upgrade',
    markdown:
      'The relevant RFC document for the [Upgrade header field is RFC 9110, section 7.8](https://httpwg.org/specs/rfc9110.html#field.upgrade). The standard establishes rules for upgrading or changing to a different protocol on the current client, server, transport protocol connection. For example, this header standard allows a client to change from HTTP 1.1 to [WebSocket](/en-US/docs/Glossary/WebSockets), assuming the server decides to acknowledge and implement the Upgrade header field. Neither party is required to accept the terms specified in the Upgrade header field. It can be used in both client and server headers. If the Upgrade header field is specified, then the sender MUST also send the Connection header field with the upgrade option specified. For details on the Connection header field [please see section 7.6.1 of the aforementioned RFC](https://httpwg.org/specs/rfc9110.html#field.connection).',
  },
  'Upgrade-Insecure-Requests': {
    description:
      "Sends a signal to the server expressing the client's preference for an encrypted and authenticated response, and that it can successfully handle the upgrade-insecure-requests directive.",
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Upgrade-Insecure-Requests',
  },
  'User-Agent': {
    description:
      'Contains a characteristic string that allows the network protocol peers to identify the application type, operating system, software vendor or software version of the requesting software user agent.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent',
    markdown:
      'Contains a characteristic string that allows the network protocol peers to identify the application type, operating system, software vendor or software version of the requesting software user agent. See also the [Firefox user agent string reference](/en-US/docs/Web/HTTP/Headers/User-Agent/Firefox).',
  },
  Vary: {
    description:
      'Determines how to match request headers to decide whether a cached response can be used rather than requesting a fresh one from the origin server.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary',
  },
  Via: {
    description:
      'Added by proxies, both forward and reverse proxies, and can appear in the request headers and the response headers.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Via',
  },
  'Viewport-Width': {
    deprecated: true,
    experimental: true,
    description:
      'A number that indicates the layout viewport width in CSS pixels. The provided pixel value is a number rounded to the smallest following integer (i.e. ceiling value).',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Viewport-Width',
  },
  Warning: {
    deprecated: true,
    description: 'General warning information about possible problems.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Warning',
  },
  Width: {
    deprecated: true,
    experimental: true,
    description:
      'A number that indicates the desired resource width in physical pixels (i.e. intrinsic size of an image).',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Width',
  },
  'WWW-Authenticate': {
    description: 'Defines the authentication method that should be used to access a resource.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/WWW-Authenticate',
  },
  'X-Content-Type-Options': {
    description: 'Disables MIME sniffing and forces browser to use the type given in Content-Type.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options',
  },
  'X-DNS-Prefetch-Control': {
    description:
      'Controls DNS prefetching, a feature by which browsers proactively perform domain name resolution on both links that the user may choose to follow as well as URLs for items referenced by the document, including images, CSS, JavaScript, and so forth.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control',
  },
  'X-Forwarded-For': {
    description:
      'Identifies the originating IP addresses of a client connecting to a web server through an HTTP proxy or a load balancer.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For',
  },
  'X-Forwarded-Host': {
    description: 'Identifies the original host requested that a client used to connect to your proxy or load balancer.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host',
  },
  'X-Forwarded-Proto': {
    description:
      'Identifies the protocol (HTTP or HTTPS) that a client used to connect to your proxy or load balancer.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto',
  },
  'X-Frame-Options': {
    description:
      'Indicates whether a browser should be allowed to render a page in a "frame", "iframe", "embed" or "object".',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
  },
  'X-Permitted-Cross-Domain-Policies': {
    description:
      "Specifies if a cross-domain policy file crossdomain.xml is allowed. The file may define a policy to grant clients, such as Adobe's Flash Player (now obsolete), Adobe Acrobat, Microsoft Silverlight (now obsolete), or Apache Flex, permission to handle data across domains that would otherwise be restricted due to the Same-Origin Policy.",
    link: '',
    markdown:
      "Specifies if a cross-domain policy file (`crossdomain.xml`) is allowed. The file may define a policy to grant clients, such as Adobe's Flash Player (now obsolete), Adobe Acrobat, Microsoft Silverlight (now obsolete), or Apache Flex, permission to handle data across domains that would otherwise be restricted due to the [Same-Origin Policy](/en-US/docs/Web/Security/Same-origin_policy). See the [Cross-domain Policy File Specification](https://www.adobe.com/devnet-docs/acrobatetk/tools/AppSec/CrossDomain_PolicyFile_Specification.pdf) for more information.",
  },
  'X-Powered-By': {
    description:
      'May be set by hosting environments or other frameworks and contains information about them while not providing any usefulness to the application or its visitors. Unset this header to avoid exposing potential vulnerabilities.',
    link: '',
  },
  'X-Robots-Tag': {
    description:
      'The "X-Robots-Tag" HTTP header is used to indicate how a web page is to be indexed within public search engine results. The header is effectively equivalent to `<meta name="robots" content="…">`.',
    link: '',
    markdown:
      'The [`X-Robots-Tag`](https://developers.google.com/search/docs/advanced/robots/robots_meta_tag) HTTP header is used to indicate how a web page is to be indexed within public search engine results. The header is effectively equivalent to `<meta name="robots" content="…">`.',
  },
  'X-XSS-Protection': {
    description: 'Enables cross-site scripting filtering.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection',
  },
  'Last-Event-ID': {
    description: '',
    link: '',
  },
  'Ping-From': {
    description: '',
    link: '',
  },
  'Ping-To': {
    description: '',
    link: '',
  },
  'Sec-WebSocket-Accept': {
    description: '',
    link: '',
  },
  'Sec-WebSocket-Extensions': {
    description: '',
    link: '',
  },
  'Sec-WebSocket-Key': {
    description: '',
    link: '',
  },
  'Sec-WebSocket-Protocol': {
    description: '',
    link: '',
  },
  'Sec-WebSocket-Version': {
    description: '',
    link: '',
  },
  'X-Firefox-Spdy': {
    description: '',
    link: '',
  },
  'X-Pingback': {
    description: '',
    link: '',
  },
  'X-Requested-With': {
    description: '',
    link: '',
  },
};

export default HTTPHeaders;
