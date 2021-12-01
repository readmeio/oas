const hars = require('..');
const toBeAValidHAR = require('jest-expect-har').default;

expect.extend({ toBeAValidHAR });

test('export should contain HARs', () => {
  expect(Object.keys(hars).length).toBeGreaterThan(0);
});

describe('HARs', () => {
  const cases = [];
  Object.keys(hars).forEach(har => {
    cases.push([har]);
  });

  it.each(cases)('`%s` should be a valid HAR', async har => {
    expect(har).not.toContain('.har');
    await expect(hars[har]).toBeAValidHAR();
  });
});
