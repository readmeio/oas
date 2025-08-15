import type { Client, ClientPlugin } from '@readme/httpsnippet/targets';

interface APIOptions {
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
  convert: () => {
    throw new Error('This plugin is expected to fail.');
  },
};

const plugin: ClientPlugin<APIOptions> = {
  target: 'node',
  client,
};

// biome-ignore lint/style/noDefaultExport: This is fine.
export default plugin;
