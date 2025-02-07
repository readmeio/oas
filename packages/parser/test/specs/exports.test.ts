import { describe, it, expect } from 'vitest';

import OpenAPIParser from '../..';

describe('Exports', () => {
  it('should export the OpenAPIParser class', () => {
    expect(OpenAPIParser).to.be.a('function');
  });

  it('should export all the static methods of OpenAPIParser', () => {
    expect(OpenAPIParser.parse).to.be.a('function');
    expect(OpenAPIParser.resolve).to.be.a('function');
    expect(OpenAPIParser.bundle).to.be.a('function');
    expect(OpenAPIParser.dereference).to.be.a('function');
  });

  it('should export the validate method', () => {
    expect(OpenAPIParser.validate).to.be.a('function');
  });
});
