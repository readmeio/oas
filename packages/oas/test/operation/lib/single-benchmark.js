import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { performance } from 'perf_hooks';
import YAML from 'js-yaml';
import Oas from '../../../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Usage
 *
 * node single-benchmark.js [file-name] [--cache] [--yaml]
 *
 * Examples:
 *   node single-benchmark.js
 *   node single-benchmark.js --cache
 *   node single-benchmark.js lots-of-circular-refs.json
 *   node single-benchmark.js lots-of-circular-refs.json --cache
 *   node single-benchmark.js lots-of-circular-refs.yaml --yaml
 *   node single-benchmark.js lots-of-circular-refs.yaml --yaml --cache
 */

async function singleBenchmark() {
  const args = process.argv.slice(2);

  // Check for flags
  const useCache = args.includes('--cache');
  const useYaml = args.includes('--yaml');
  const argsWithoutFlags = args.filter(arg => arg !== '--cache' && arg !== '--yaml');

  // Default to lots-of-circular-refs.json if no file is provided
  const fileName = argsWithoutFlags[0] || 'lots-of-circular-refs.json';

  console.log('='.repeat(80));
  console.log('SINGLE OPERATION BENCHMARK');
  console.log('='.repeat(80));
  console.log(`File: ${fileName}`);

  // Load OAS document
  const filePath = join(__dirname, '../../../../oas-examples/3.0', useYaml ? 'yaml' : 'json', fileName);
  const fileContent = readFileSync(filePath, 'utf-8');
  const jsonContent = useYaml ? YAML.load(fileContent) : JSON.parse(fileContent);

  const oas = Oas.init(jsonContent);
  await oas.dereference();

  // Get all paths and methods
  const paths = jsonContent.paths || {};
  const pathEntries = Object.entries(paths);
  const operations = [];

  for (const [path, pathItem] of pathEntries) {
    if (!pathItem) continue;

    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
    for (const method of methods) {
      if (pathItem[method]) {
        operations.push({ path, method });
      }
    }
  }

  console.log(`Found ${operations.length} operations in file\n`);

  // Use first operation
  const selectedOp = operations[0];
  console.log(`Using first operation: ${selectedOp.method.toUpperCase()} ${selectedOp.path}\n`);

  const operation = oas.operation(selectedOp.path, selectedOp.method);

  if (useCache) {
    // Test with cache (5 iterations) - uses the Oas instance's built-in cache
    console.log('--- With Cache (5 iterations, using built-in Oas cache) ---');
    const iterations = 5;
    const withCacheTimes = [];

    for (let i = 0; i < iterations; i++) {
      const startWithCache = performance.now();
      operation.getParametersAsJSONSchema();
      const endWithCache = performance.now();
      withCacheTimes.push(endWithCache - startWithCache);
      console.log(`  Iteration ${i + 1}: ${withCacheTimes[i].toFixed(4)}ms`);
    }

    const avgWithCache = withCacheTimes.reduce((a, b) => a + b, 0) / iterations;
    console.log(`\nAverage: ${avgWithCache.toFixed(4)}ms`);
    console.log(`Min: ${Math.min(...withCacheTimes).toFixed(4)}ms`);
    console.log(`Max: ${Math.max(...withCacheTimes).toFixed(4)}ms`);
  } else {
    // Test without cache (5 iterations)
    console.log('--- Without Cache (5 iterations) ---');
    const iterations = 5;
    const noCacheTimes = [];

    for (let i = 0; i < iterations; i++) {
      const startNoCache = performance.now();
      operation.getParametersAsJSONSchema({ componentCache: null });
      const endNoCache = performance.now();
      noCacheTimes.push(endNoCache - startNoCache);
      console.log(`  Iteration ${i + 1}: ${noCacheTimes[i].toFixed(4)}ms`);
    }

    const avgNoCache = noCacheTimes.reduce((a, b) => a + b, 0) / iterations;
    console.log(`\nAverage: ${avgNoCache.toFixed(4)}ms`);
    console.log(`Min: ${Math.min(...noCacheTimes).toFixed(4)}ms`);
    console.log(`Max: ${Math.max(...noCacheTimes).toFixed(4)}ms`);
  }

  console.log('\n' + '='.repeat(80));
}

singleBenchmark().catch(console.error);
