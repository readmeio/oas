import { describe, expect, it } from 'vitest';

import { getInstallInstructionsForLanguage } from '../../src/lib/utils.js';

describe('#getInstallInstructionsForLanguage', () => {
  it('should retrieve an installation command for a given language', () => {
    expect(getInstallInstructionsForLanguage(['node', 'axios'], '@developers/v2.0#17273l2glm9fq4l5')).toBe(
      'npm install axios --save',
    );
  });

  it('should retrieve a templated `api` install command', () => {
    expect(getInstallInstructionsForLanguage(['node', 'api'], '@developers/v2.0#17273l2glm9fq4l5')).toBe(
      'npx api install @developers/v2.0#17273l2glm9fq4l5',
    );
  });
});
