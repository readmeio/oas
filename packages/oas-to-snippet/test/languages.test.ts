import httpsnippetClientAPIPlugin from 'httpsnippet-client-api';
import { describe, it, expect } from 'vitest';

import { getSupportedLanguages, getClientInstallationInstructions } from '../src/languages.js';

describe('#getSupportedLanguages', () => {
  it('should retrieve our default supported languages', () => {
    const languages = getSupportedLanguages();

    // This plugin hasn't been loaded here so it shouldn't be present in our language list.
    expect(languages.node.httpsnippet.targets.api).toBeUndefined();
    expect(languages).toMatchSnapshot();
  });

  it('should support external plugins', () => {
    const languages = getSupportedLanguages({
      plugins: [httpsnippetClientAPIPlugin],
    });

    expect(languages.node.httpsnippet.targets.api).toStrictEqual({
      name: 'API',
      install: 'npx api install {packageName}',
    });
  });
});

describe('#getClientInstallationInstructions', () => {
  it('should retrieve an installation command for a given language', () => {
    const languages = getSupportedLanguages();
    expect(getClientInstallationInstructions(languages, ['node', 'axios'], '@developers/v2.0#17273l2glm9fq4l5')).toBe(
      'npm install axios --save',
    );
  });

  it('should not pull back instructions for a language that has none', () => {
    const languages = getSupportedLanguages();
    expect(getClientInstallationInstructions(languages, 'objectivec')).toBeUndefined();
  });

  it('should retrieve a templated `api` install command if the `api` plugin is loaded', () => {
    const languages = getSupportedLanguages({
      plugins: [httpsnippetClientAPIPlugin],
    });

    expect(getClientInstallationInstructions(languages, ['node', 'api'], '@developers/v2.0#17273l2glm9fq4l5')).toBe(
      'npx api install @developers/v2.0#17273l2glm9fq4l5',
    );
  });

  it('should retrieve nothing if for `api` install command if the `api` plugin is not loaded', () => {
    const languages = getSupportedLanguages();

    expect(
      getClientInstallationInstructions(languages, ['node', 'api'], '@developers/v2.0#17273l2glm9fq4l5'),
    ).toBeUndefined();
  });
});
