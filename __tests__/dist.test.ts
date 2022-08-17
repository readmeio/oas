import type { OASDocument } from '../dist/rmoas.types';

import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json';

import Oas from '..';

describe('typescript dist verification', function () {
  it('should be able to accept an OpenAPI definition in the constructor', () => {
    expect(new Oas(petstoreSpec as OASDocument).getVersion()).toBe('3.0.0');
  });
});
