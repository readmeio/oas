import fs from 'node:fs';
import path from 'node:path';

const SPEC_SITE = '.tmp/spec.openapis.org/oas';
const SPEC_REPO = '.tmp/OpenAPI-Specification';
const OUT = 'src/schemas';

/**
 * Retrieve the latest dated release of a schema from the `spec.openapis.org` repository. Schemas
 * there are published as extensionless, date-stamped files (eg. `oas/3.2/schema/2025-11-23`).
 */
function getLatestSchema(version: string) {
  const dir = path.join(SPEC_SITE, version, 'schema');
  const releases = fs
    .readdirSync(dir)
    .filter(file => /^\d{4}-\d{2}-\d{2}$/.test(file))
    .sort();

  if (!releases.length) {
    throw new Error(`No dated schema releases were found in ${dir}.`);
  }

  const latest = releases[releases.length - 1];
  console.log(`v${version}: using the ${latest} release`);
  return JSON.parse(fs.readFileSync(path.join(dir, latest), 'utf8'));
}

// Swagger 1.2 schemas are no longer maintained and now only exist within the archives of the
// `OpenAPI-Specification` repository.
fs.mkdirSync(path.join(OUT, 'v1.2'), { recursive: true });
fs.readdirSync(path.join(SPEC_REPO, '_archive_/schemas/v1.2'))
  .filter(file => file.endsWith('.json'))
  .forEach(file => {
    fs.copyFileSync(path.join(SPEC_REPO, '_archive_/schemas/v1.2', file), path.join(OUT, 'v1.2', file));
  });

['2.0', '3.0', '3.1', '3.2'].forEach(version => {
  const schema = getLatestSchema(version);
  fs.mkdirSync(path.join(OUT, `v${version}`), { recursive: true });
  fs.writeFileSync(path.join(OUT, `v${version}`, 'schema.json'), JSON.stringify(schema, null, 2));
});

// The `header.schema` block in the 3.1+ schemas contains a `$dynamicRef` that some validators
// (like AJV within `@readme/openapi-parser`) are unable to process, so we also ship "legacy"
// copies of those schemas with that block replaced.
//
// https://github.com/readmeio/openapi-schemas/pull/2
['3.1', '3.2'].forEach(version => {
  const schema = JSON.parse(fs.readFileSync(path.join(OUT, `v${version}`, 'schema.json'), 'utf8'));
  schema.$defs.header.properties.schema = { type: ['object', 'boolean'] };
  fs.writeFileSync(path.join(OUT, `v${version}`, 'legacy-schema.json'), JSON.stringify(schema, null, 2));
});

console.log('schemas built!');
