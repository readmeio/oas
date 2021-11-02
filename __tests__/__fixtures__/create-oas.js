import Oas from '../../src';

export default function createOas(operation, components) {
  const schema = {
    paths: {
      '/': {
        get: operation,
      },
    },
  };

  if (components) {
    schema.components = components;
  }

  return new Oas(schema);
}
