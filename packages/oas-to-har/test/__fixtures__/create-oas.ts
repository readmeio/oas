import type { OASDocument } from 'oas/types';

import Oas from 'oas';

export default function createOas(method) {
  return function (path, operation) {
    return new Oas({
      paths: {
        [path]: {
          [method]: operation,
        },
      },
    } as unknown as OASDocument);
  };
}
