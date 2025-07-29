import type { OASDocument } from 'oas/types';

import Oas from 'oas';

export default function createOas(method) {
  return (path, operation) =>
    new Oas({
      paths: {
        [path]: {
          [method]: operation,
        },
      },
    } as unknown as OASDocument);
}
