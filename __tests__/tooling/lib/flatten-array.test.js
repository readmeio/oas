const flattenArray = require('../../../tooling/lib/flatten-array');

test('should flatten array', () => {
  const array = [[1], [2, 3], [[4, 5]]];
  expect(flattenArray(array)).toStrictEqual([1, 2, 3, 4, 5]);
});
