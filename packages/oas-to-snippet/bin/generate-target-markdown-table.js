#! /usr/bin/env node
import fs from 'node:fs/promises';

import { availableTargets } from '@readme/httpsnippet';

import { getSupportedLanguages } from '@readme/oas-to-snippet/languages';

const targets = availableTargets();

function getTarget(targetKey) {
  return targets.find(target => target.key === targetKey);
}

/**
 * Generates a Markdown table that documents all supported snippets.
 */
async function run() {
  try {
    const supportedLanguages = getSupportedLanguages();
    const output = ['| Language | Available language mode(s) | Libraries (if applicable)', '| :---- | :---- | :---- |'];

    Object.keys(supportedLanguages).forEach(lang => {
      let languageTitle = 'TKTK';
      const languageMode = lang;
      let libraries = [];

      // Corresponding language in httpsnippet library
      const httpsnippetLang = supportedLanguages[lang].httpsnippet.lang;
      // Corresponding httpsnippet target object
      const httpsnippetTarget = getTarget(httpsnippetLang);
      if (!httpsnippetTarget) {
        throw new Error(`Unable to locate the target for ${httpsnippetLang}.`);
      }

      // C++ is weird in that it uses the httpsnippet data for C but this library
      // represents it as a separate language
      if (lang === 'cplusplus') {
        languageTitle = 'C++';
      } else {
        languageTitle = httpsnippetTarget.title;
      }

      if (httpsnippetTarget?.clients.length) {
        libraries = httpsnippetTarget.clients.map(client => {
          return `[${client.title}](${client.link})`;
        });
      }

      output.push(`| ${languageTitle} | \`${languageMode}\` | ${libraries.join(', ')}`.trim());
    });

    // Update README.md
    const readmeFile = await fs.readFile('README.md', { encoding: 'utf-8' });

    const updatedFile = readmeFile.replace(
      // https://stackoverflow.com/a/24375554
      /<!-- table-start -->([\S\s]*?)<!-- table-end -->/g,
      `<!-- table-start -->\n${output.join('\n')}\n<!-- table-end -->`,
    );

    await fs.writeFile('README.md', updatedFile, { encoding: 'utf-8' });

    // eslint-disable-next-line no-console
    console.log('Table updated!');
    return process.exit(0);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error updating Markdown Table!');
    // eslint-disable-next-line no-console
    console.error(e);
    return process.exit(1);
  }
}

run();
