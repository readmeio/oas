const { expect } = require('chai');

const OpenAPIParser = require('../..');

describe('Exports', () => {
  it('should export the OpenAPIParser class', async () => {
    expect(OpenAPIParser).to.be.a('function');
  });

  it('should export all the static methods of OpenAPIParser', async () => {
    expect(OpenAPIParser.parse).to.be.a('function');
    expect(OpenAPIParser.resolve).to.be.a('function');
    expect(OpenAPIParser.bundle).to.be.a('function');
    expect(OpenAPIParser.dereference).to.be.a('function');
  });

  it('should export the validate method', async () => {
    expect(OpenAPIParser.validate).to.be.a('function');
  });
});
