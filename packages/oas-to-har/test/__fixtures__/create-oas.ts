import type { OASDocument, OperationObject } from 'oas/types';

import Oas from 'oas';

export function createOas(method: string) {
  return (path: string, operation: OperationObject): Oas => {
    return new Oas({
      paths: {
        [path]: {
          [method]: operation,
        },
      },
    } as unknown as OASDocument);
  };
}
