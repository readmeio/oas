module.exports = {
  log: {
    entries: [
      {
        startedDateTime: new Date().toISOString(),
        time: new Date().getMilliseconds(),
        request: {
          method: 'GET',
          url: 'https://httpbin.org/xml',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [
            {
              name: 'Accept',
              value: 'application/xml',
            },
          ],
          queryString: [],
          bodySize: -1,
          headersSize: -1,
        },
        response: {
          status: 200,
          statusText: 'OK',
          httpVersion: 'HTTP/1.1',
          headers: [
            { name: 'Content-Type', value: 'application/xml' },
            { name: 'Content-Length', value: 522 },
          ],
          content: {
            size: 522,
            mimeType: 'application/xml',
            text: '<?xml version=\'1.0\' encoding=\'us-ascii\'?>\n<!--  A SAMPLE set of slides  -->\n<slideshow\n    title="Sample Slide Show"\n    date="Date of publication"\n    author="Yours Truly"\n    >\n    <!-- TITLE SLIDE -->\n    <slide type="all">\n        <title>Wake up to WonderWidgets!</title>\n    </slide>\n    <!-- OVERVIEW -->\n    <slide type="all">\n        <title>Overview</title>\n        <item>Why\n            <em>WonderWidgets</em> are great\n        </item>\n        <item/>\n        <item>Who\n            <em>buys</em> WonderWidgets\n        </item>\n    </slide>\n</slideshow>',
          },
          headersSize: -1,
          bodySize: -1,
        },
      },
    ],
  },
};
