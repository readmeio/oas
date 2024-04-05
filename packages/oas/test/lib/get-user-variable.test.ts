import { test, expect } from 'vitest';

import getUserVariable from '../../src/lib/get-user-variable.js';

const topLevelUser = { apiKey: '123456', user: 'user', pass: 'pass' };
const keysUser = {
  keys: [
    { apiKey: '123456', name: 'app-1' },
    { apiKey: '7890', name: 'app-2' },
  ],
};

test('should handle if keys is an empty array', () => {
  expect(getUserVariable({ keys: [] }, 'apiKey')).toBeNull();
});

test('should handle if keys is null', () => {
  expect(getUserVariable({ keys: null }, 'apiKey')).toBeNull();
});

test('should return top level property', () => {
  expect(getUserVariable(topLevelUser, 'apiKey')).toBe('123456');
});

test('should return first item from keys array if no app selected', () => {
  expect(getUserVariable(keysUser, 'apiKey')).toBe('123456');
});

test('should grab item from keys array in combined object', () => {
  expect(getUserVariable({ ...topLevelUser, ...keysUser }, 'apiKey')).toBe('123456');
});

test('should grab item from keys array with specific app name in combined object', () => {
  expect(getUserVariable({ ...topLevelUser, ...keysUser }, 'apiKey', 'app-2')).toBe('7890');
});

test('should fall back to top-level item if not present in keys array', () => {
  expect(getUserVariable({ ...topLevelUser, ...keysUser }, 'user')).toBe('user');
});

test('should return selected app from keys array if app provided', () => {
  expect(getUserVariable(keysUser, 'apiKey', 'app-2')).toBe('7890');
});
