import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { performance } from 'perf_hooks';
import Oas from '../../../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Usage
 *
 * node single-benchmark.js [file-name] [path] [method] [--cache]
 *
 * Examples:
 *   node single-benchmark.js
 *   node single-benchmark.js --cache
 *   node single-benchmark.js lots-of-circular-refs.json
 *   node single-benchmark.js lots-of-circular-refs.json --cache
 *   node single-benchmark.js lots-of-circular-refs.json /users get --cache
 */

async function singleBenchmark() {
  const args = process.argv.slice(2);

  // Check for --cache flag
  const useCache = args.includes('--cache');
  const argsWithoutFlags = args.filter(arg => arg !== '--cache');

  // Default to lots-of-circular-refs.json if no file is provided
  const fileName = argsWithoutFlags[0] || 'lots-of-circular-refs.json';
  const targetPath = argsWithoutFlags[1] || null;
  const targetMethod = argsWithoutFlags[2] || null;

  console.log('='.repeat(80));
  console.log('SINGLE OPERATION BENCHMARK');
  console.log('='.repeat(80));
  console.log(`File: ${fileName}`);

  // Load OAS document
  const jsonPath = join(__dirname, '../../../../oas-examples/3.0/json', fileName);
  const jsonContent = JSON.parse(readFileSync(jsonPath, 'utf-8'));

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

  // Select operation
  let selectedOp;
  if (targetPath && targetMethod) {
    selectedOp = operations.find(
      op => op.path === targetPath && op.method.toLowerCase() === targetMethod.toLowerCase(),
    );
    if (!selectedOp) {
      console.error(`Operation not found: ${targetMethod.toUpperCase()} ${targetPath}`);
      console.error('\nAvailable operations:');
      operations.slice(0, 20).forEach(op => {
        console.error(`  ${op.method.toUpperCase()} ${op.path}`);
      });
      if (operations.length > 20) {
        console.error(`  ... and ${operations.length - 20} more`);
      }
      process.exit(1);
    }
  } else {
    selectedOp = operations[0];
    console.log(`Using first operation: ${selectedOp.method.toUpperCase()} ${selectedOp.path}\n`);
  }

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
