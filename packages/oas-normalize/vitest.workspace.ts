/* eslint-disable require-extensions/require-extensions */
// eslint-disable-next-line import/no-extraneous-dependencies
import { defineWorkspace } from 'vitest/config';

import defaultConfig from './vitest.config';
import chdirConfig from './vitest.config.chdir';

export default defineWorkspace([defaultConfig, chdirConfig]);
