import type { OASDocument } from '../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import webhooksSpec from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import {
  computeOperationScope,
  computeWebhookScope,
  estimateScopedSize,
  isAncestorOfScope,
  isPointerInScope,
  toPointer,
} from '../../src/analyzer/scope.js';

describe('#computeOperationScope()', () => {
  it('should scope to the operation itself, and its security scheme, when it has no other `$ref` pointers', () => {
    const scope = computeOperationScope(petstore as OASDocument, '/store/inventory', 'get');

    expect(scope.rootPointer).toBe('/paths/~1store~1inventory/get');
    expect(scope.reachableRefs).toStrictEqual(new Set(['#/components/securitySchemes/api_key']));
  });

  it('should transitively follow `$ref` pointers into referenced schemas', () => {
    // `POST /pet`'s `requestBody` is a `$ref` to `#/components/requestBodies/Pet`, whose content
    // schemas are themselves `$ref` pointers to `#/components/schemas/Pet`, which itself contains
    // `$ref` pointers to `Category` and `Tag`. All of that should be reachable, even though none of
    // it is directly on the operation.
    const scope = computeOperationScope(petstore as OASDocument, '/pet', 'post');

    expect(scope.reachableRefs).toStrictEqual(
      new Set([
        '#/components/requestBodies/Pet',
        '#/components/schemas/Pet',
        '#/components/schemas/Category',
        '#/components/schemas/Tag',
        '#/components/securitySchemes/petstore_auth',
      ]),
    );
  });

  it('should be case-insensitive for both the path and the method', () => {
    const scope = computeOperationScope(petstore as OASDocument, '/PET', 'POST');

    expect(scope.rootPointer).toBe('/paths/~1pet/post');
  });

  it('should scope operation-level security requirements to their security scheme', () => {
    // `GET /pet/{petId}` uses `api_key`, not the `petstore_auth` that `POST /pet` uses.
    const scope = computeOperationScope(petstore as OASDocument, '/pet/{petId}', 'get');

    expect(scope.reachableRefs.has('#/components/securitySchemes/api_key')).toBe(true);
    expect(scope.reachableRefs.has('#/components/securitySchemes/petstore_auth')).toBe(false);
  });

  it('should throw if the path does not exist', () => {
    expect(() => computeOperationScope(petstore as OASDocument, '/nope', 'get')).toThrow('Path `/nope` not found.');
  });

  it('should throw if the operation does not exist on an otherwise valid path', () => {
    expect(() => computeOperationScope(petstore as OASDocument, '/pet', 'trace')).toThrow(
      'Operation `trace /pet` not found.',
    );
  });
});

describe('#computeWebhookScope()', () => {
  it('should transitively follow `$ref` pointers into referenced schemas', () => {
    const scope = computeWebhookScope(webhooksSpec as unknown as OASDocument, 'newPet', 'post');

    expect(scope.rootPointer).toBe('/webhooks/newPet/post');
    expect(scope.reachableRefs).toStrictEqual(new Set(['#/components/schemas/Pet']));
  });

  it('should throw if the webhook does not exist', () => {
    expect(() => computeWebhookScope(webhooksSpec as unknown as OASDocument, 'nope', 'post')).toThrow(
      'Webhook `nope` not found.',
    );
  });

  it('should throw if the webhook operation does not exist on an otherwise valid webhook', () => {
    expect(() => computeWebhookScope(webhooksSpec as unknown as OASDocument, 'newPet', 'patch')).toThrow(
      'Webhook operation `patch newPet` not found.',
    );
  });
});

describe('#isPointerInScope()', () => {
  const scope = computeOperationScope(petstore as OASDocument, '/pet', 'post');

  it('should consider the operation itself in scope', () => {
    expect(isPointerInScope('/paths/~1pet/post/requestBody', scope)).toBe(true);
  });

  it('should consider a reachable component in scope', () => {
    expect(isPointerInScope('/components/schemas/Pet/properties/category', scope)).toBe(true);
  });

  it('should not consider an unrelated operation in scope', () => {
    expect(isPointerInScope('/paths/~1pet/put/requestBody', scope)).toBe(false);
  });

  it('should not treat a sibling with a shared prefix as in scope', () => {
    // `/paths/~1pet` is a prefix of `/paths/~1pet~1findByStatus` as a raw string, but they're
    // unrelated paths and shouldn't be conflated.
    expect(isPointerInScope('/paths/~1pet~1findByStatus/get', scope)).toBe(false);
  });
});

describe('#isAncestorOfScope()', () => {
  it('should identify when a scope is nested within a coarser pointer', () => {
    const scope = computeWebhookScope(webhooksSpec as unknown as OASDocument, 'newPet', 'post');

    expect(isAncestorOfScope('/webhooks/newPet', scope)).toBe(true);
    expect(isAncestorOfScope('/webhooks/somethingElse', scope)).toBe(false);
  });
});

describe('#toPointer()', () => {
  it('should strip a leading `#` off of a `$ref` pointer', () => {
    expect(toPointer('#/components/schemas/Pet')).toBe('/components/schemas/Pet');
  });

  it('should leave an already-plain pointer alone', () => {
    expect(toPointer('/components/schemas/Pet')).toBe('/components/schemas/Pet');
  });
});

describe('#estimateScopedSize()', () => {
  it('should estimate a nonzero size for an operation that references components', () => {
    const scope = computeOperationScope(petstore as OASDocument, '/pet', 'post');

    expect(estimateScopedSize(petstore, scope)).toBeGreaterThan(0);
  });

  it('should not double-count a pointer that appears in both `extraPointers` and `reachableRefs`', () => {
    const scope = computeOperationScope(petstore as OASDocument, '/store/inventory', 'get');
    const sizeOnce = estimateScopedSize(petstore, scope);

    // Estimating twice against the same root and scope should be idempotent (this is also what
    // exercises the memoized size cache).
    expect(estimateScopedSize(petstore, scope)).toBe(sizeOnce);
  });
});
