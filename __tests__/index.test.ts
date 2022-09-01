import toBeAValidHAR from '../src';

import har from './__fixtures__/har.valid.json';

expect.extend({ toBeAValidHAR });

test('should accept a valid HAR', async () => {
  await expect(har).toBeAValidHAR();
});

test('should reject an invalid HAR', async () => {
  await expect({
    log: {
      entries: [
        {
          request: {
            url: 'https://example.com',
          },
        },
      ],
    },
  }).not.toBeAValidHAR();
});
