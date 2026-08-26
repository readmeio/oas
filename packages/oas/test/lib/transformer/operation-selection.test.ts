import { describe, expect, it } from 'vitest';

import { OperationSelection } from '../../../src/lib/transformer/operation-selection.js';

describe('OperationSelection', () => {
  it('matches names and methods without regard to casing', () => {
    const selection = new OperationSelection();

    selection.addOperation('/Pets', 'GET');

    expect(selection.hasSelections).toBe(true);
    expect(selection.has('/pets')).toBe(true);
    expect(selection.matches('/PETS', 'get')).toBe(true);
    expect(selection.matches('/pets', 'post')).toBe(false);
  });

  it('can replace an all-operation selection after it is cleared', () => {
    const selection = new OperationSelection();

    selection.addAll('/pets');
    selection.clear('/pets');
    selection.addOperation('/pets', 'get');
    selection.addOperation('/pets', 'post');

    expect(selection.matches('/pets', 'get')).toBe(true);
    expect(selection.matches('/pets', 'post')).toBe(true);
    expect(selection.matches('/pets', 'delete')).toBe(false);
  });

  it('preserves an all-operation selection when adding individual operations', () => {
    const selection = new OperationSelection();

    selection.addAll('/pets');
    selection.addOperation('/pets', 'get');

    expect(selection.matchesAll('/pets')).toBe(true);
    expect(selection.matches('/pets', 'get')).toBe(true);
    expect(selection.matches('/pets', 'post')).toBe(true);
    expect(selection.matches('/cats', 'get')).toBe(false);
  });
});
