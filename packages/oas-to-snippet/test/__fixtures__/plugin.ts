/**
 * This is a plugin that lightly mimics the behavior of `httpsnippet-client-api` and is used to
 * test behaviors related to surfacing snippets from it over stock `node` options.
 *
 * Why not just use `httpsnippet-client-api`? Because it depends on `oas` we end up with a bit of
 * a circular dependency where if we make breaking changes to `oas`, which would update
 * `oas-to-snippet` we then need to update `httpsnippet-client-api` to match. If we don't do this
 * then the `httpsnippet-client-api` and `oas` dependencies within `oas-to-snippet` get into a
 * weird state within NPM where there become conflicts and NPM is unable to load the right one.
 *
 */
import type { Client, ClientPlugin } from '@readme/httpsnippet/targets';
import type { OASDocument } from 'oas/types';

import { CodeBuilder } from '@readme/httpsnippet/helpers/code-builder';

interface APIOptions {
  api?: {
    definition: OASDocument;

    /**
     * The string to identify this SDK as. This is used in the `import sdk from '<identifier>'`
     * sample as well as the the variable name we attach the SDK to.
     *
     * @example `@api/developers`
     */
    identifier?: string;

    /**
     * The URI that is used to download this API definition from `npx api install`.
     *
     * @example `@developers/v2.0#17273l2glm9fq4l5`
     */
    registryURI: string;
  };
  escapeBrackets?: boolean;
  indent?: string | false;
}

const client: Client<APIOptions> = {
  info: {
    key: 'api',
    title: 'API',
    link: 'https://npm.im/api',
    description: 'Automatic SDK generation from an OpenAPI definition.',
    extname: '.js',
    installation: 'npx api install "{packageName}"',
  },
  convert: (request, options) => {
    const { blank, push, join } = new CodeBuilder({ indent: options?.indent || '  ' });

    push("console.log('example `api` plugin code snippet.')");
    if (options?.api?.identifier) {
      push(`const ${options.api.identifier} = 'example variable name';`);
    }
    blank();

    return join();
  },
};

const plugin: ClientPlugin<APIOptions> = {
  target: 'node',
  client,
};

// biome-ignore lint/style/noDefaultExport: This is fine.
export default plugin;
