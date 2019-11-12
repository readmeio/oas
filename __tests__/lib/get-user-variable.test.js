const getUserVariable = require('../../src/lib/get-user-variable');

const topLevelUser = { apiKey: '123456', user: 'user', pass: 'pass' };
const keysUser = { keys: [{ apiKey: '123456', name: 'app-1' }, { apiKey: '7890', name: 'app-2' }] };

test('should return top level property', () => {
  expect(getUserVariable(topLevelUser, 'apiKey')).toBe('123456');
});

test('should return first item from keys array if no app selected', () => {
  expect(getUserVariable(keysUser, 'apiKey')).toBe('123456');
});

test('should return selected app from keys array if app provided', () => {
  expect(getUserVariable(keysUser, 'apiKey', 'app-2')).toBe('7890');
});

test('should return null for anything else', () => {
  expect(getUserVariable(topLevelUser, { type: 'unknown' })).toBeNull();
  expect(getUserVariable(keysUser, { type: 'unknown' })).toBeNull();
  expect(getUserVariable(keysUser, { type: 'unknown' }, 'app-2')).toBeNull();
});
