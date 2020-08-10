const hars = require('..');

test('export should contain HARs', () => {
  expect(Object.keys(hars).length).toBeGreaterThan(0);
});

describe('HARs', () => {
  const cases = [];
  Object.keys(hars).forEach(har => {
    cases.push([har]);
  });

  it.each(cases)('`%s` should be a valid HAR', async har => {
    await expect(hars[har]).toBeAValidHAR();
  });
});
