import type { HTTPStatusCode } from '../src/index.js';

import { describe, test, it, expect } from 'vitest';

import { codes, getStatusCode, getStatusCodeMessage, isStatusCodeSuccessful, isStatusCodeValid } from '../src/index.js';

test('assure that every code is properly defined', () => {
  expect.hasAssertions();

  (Object.keys(codes) as HTTPStatusCode[]).forEach(code => {
    expect(Array.isArray(codes[code])).toBe(true);
    expect(codes[code]).toHaveLength(2);
    expect(typeof codes[code][0]).toBe('string');
    expect(typeof codes[code][1]).toBe('boolean');
  });
});

describe('#getStatusCode()', () => {
  it('should return information about a status code', () => {
    expect(getStatusCode('1XX')).toStrictEqual({ code: '1XX', message: 'Informational', success: true });
    expect(getStatusCode(100)).toStrictEqual({ code: 100, message: 'Continue', success: true });
    expect(getStatusCode('2XX')).toStrictEqual({ code: '2XX', message: 'Success', success: true });
    expect(getStatusCode(200)).toStrictEqual({ code: 200, message: 'OK', success: true });
    expect(getStatusCode('3XX')).toStrictEqual({ code: '3XX', message: 'Redirection', success: true });
    expect(getStatusCode(300)).toStrictEqual({ code: 300, message: 'Multiple Choices', success: true });
    expect(getStatusCode('4XX')).toStrictEqual({ code: '4XX', message: 'Client Error', success: false });
    expect(getStatusCode(400)).toStrictEqual({ code: 400, message: 'Bad Request', success: false });
    expect(getStatusCode('5XX')).toStrictEqual({ code: '5XX', message: 'Server Error', success: false });
    expect(getStatusCode(500)).toStrictEqual({ code: 500, message: 'Internal Server Error', success: false });
  });

  it('should support a default status code', () => {
    expect(getStatusCode('default')).toStrictEqual({
      code: '', // Since there's no HTTP status code that can really match up with this, `code` should be empty.
      message: 'Default',
      success: true,
    });
  });

  it('should throw an error for an unknown status code', () => {
    expect(() => {
      return getStatusCode(1000);
    }).toThrow(/not a known HTTP status code/);
  });
});

describe('#getStatusCodeMessage()', () => {
  it('should return information about a status code', () => {
    expect(getStatusCodeMessage('1XX')).toBe('1XX Informational');
    expect(getStatusCodeMessage(100)).toBe('100 Continue');
    expect(getStatusCodeMessage('2XX')).toBe('2XX Success');
    expect(getStatusCodeMessage(200)).toBe('200 OK');
    expect(getStatusCodeMessage('3XX')).toBe('3XX Redirection');
    expect(getStatusCodeMessage(300)).toBe('300 Multiple Choices');
    expect(getStatusCodeMessage('4XX')).toBe('4XX Client Error');
    expect(getStatusCodeMessage(400)).toBe('400 Bad Request');
    expect(getStatusCodeMessage('5XX')).toBe('5XX Server Error');
    expect(getStatusCodeMessage(500)).toBe('500 Internal Server Error');
  });

  it('should throw an error for an unknown status code', () => {
    expect(() => {
      return getStatusCode(1000);
    }).toThrow(/not a known HTTP status code/);
  });
});

describe('#isStatusCodeSuccessful()', () => {
  it.each([['default'], ['1XX'], [100], ['2XX'], [200], ['3XX'], [300]])(
    'should return true for a %s status code',
    code => {
      expect(isStatusCodeSuccessful(code)).toBe(true);
    },
  );

  it.each([['4XX'], [400], ['5XX'], [500]])('should return false for a %s status code', code => {
    expect(isStatusCodeSuccessful(code)).toBe(false);
  });

  it('should return false when given an invalid status code', () => {
    expect(isStatusCodeSuccessful(1000)).toBe(false);
  });
});

describe('#isStatusCodeValid()', () => {
  it('should return true for a valid status code', () => {
    expect(isStatusCodeValid(200)).toBe(true);
  });

  it('should return true for a default status code', () => {
    expect(isStatusCodeValid('default')).toBe(true);
  });

  it('should return false for an invalid status code', () => {
    expect(isStatusCodeValid(1000)).toBe(false);
  });
});
