import nodePath from 'node:path';

import { beforeAll } from 'vitest';

const __dirname = import.meta.dirname;

beforeAll(() => {
  // Because this library tests do a lot of processing on **relative** file paths in order for
  // these tests need to function properly they need to be run from the `test/` directory.
  process.chdir(nodePath.join(__dirname));
});
