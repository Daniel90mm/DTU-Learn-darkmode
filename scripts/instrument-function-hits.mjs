#!/usr/bin/env node
/**
 * Generate instrumented JS files with function-hit counters.
 *
 * This does NOT edit source files by default.
 * It writes instrumented copies to dist/debug-usage/.
 *
 * Usage:
 *   node scripts/instrument-function-hits.mjs
 *   node scripts/instrument-function-hits.mjs darkmode.js background.js
 *   node scripts/instrument-function-hits.mjs --out-dir dist/debug-usage myfile.js
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_FILES = ['darkmode.js', 'background.js'];
const DEFAULT_OUT_DIR = path.resolve(process.cwd(), 'dist', 'debug-usage');

const TRACKER_PREAMBLE = `
;(function () {
  var root;
  try { root = globalThis; } catch (e0) { root = (typeof window !== 'undefined' ? window : this); }
  if (!root) return;
  if (!root.__DTU_USAGE__) {
    var usageStore = {
      hits: Object.create(null),
      hit: function (name) {
        try {
          usageStore.hits[name] = (usageStore.hits[name] || 0) + 1;
        } catch (e1) { }
      },
      dump: function () {
        try {
          var rows = Object.keys(usageStore.hits).map(function (k) { return [k, usageStore.hits[k]]; });
          rows.sort(function (a, b) { return b[1] - a[1]; });
          return rows;
        } catch (e2) {
          return [];
        }
      },
      reset: function () {
        usageStore.hits = Object.create(null);
      }
    };
    root.__DTU_USAGE__ = usageStore;
  }
  if (!root.__DTU_USAGE_BRIDGE_INSTALLED__) {
    root.__DTU_USAGE_BRIDGE_INSTALLED__ = true;
    var reqEvent = '__DTU_USAGE_DUMP_REQUEST__';
    var resetEvent = '__DTU_USAGE_RESET_REQUEST__';
    var outAttr = 'data-dtu-usage-dump';
    if (root.addEventListener) {
      root.addEventListener(reqEvent, function () {
        try {
          var payload = JSON.stringify(root.__DTU_USAGE__.dump());
          if (root.document && root.document.documentElement) {
            root.document.documentElement.setAttribute(outAttr, payload);
          }
        } catch (e3) { }
      });
      root.addEventListener(resetEvent, function () {
        try { root.__DTU_USAGE__.reset(); } catch (e4) { }
      });
    }
  }
})();
`;

function parseArgs(argv) {
    const args = argv.slice(2);
    const files = [];
    let outDir = DEFAULT_OUT_DIR;
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--out-dir') {
            const next = args[i + 1];
            if (!next) {
                throw new Error('--out-dir requires a value');
            }
            outDir = path.resolve(process.cwd(), next);
            i++;
            continue;
        }
        files.push(a);
    }
    return { files, outDir };
}

function injectFunctionHits(src) {
    let count = 0;
    function bump() { count++; }

    // Named function declarations.
    src = src.replace(
        /(\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{)/g,
        (full, head, name) => {
            bump();
            return `${head} __DTU_USAGE__.hit(${JSON.stringify(name)});`;
        }
    );

    // const foo = function (...) { ... }
    src = src.replace(
        /(\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function(?:\s+[A-Za-z_$][\w$]*)?\s*\([^)]*\)\s*\{)/g,
        (full, head, name) => {
            bump();
            return `${head} __DTU_USAGE__.hit(${JSON.stringify(name)});`;
        }
    );

    // const foo = (...) => { ... }
    src = src.replace(
        /(\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{)/g,
        (full, head, name) => {
            bump();
            return `${head} __DTU_USAGE__.hit(${JSON.stringify(name)});`;
        }
    );

    return {
        code: TRACKER_PREAMBLE + '\n' + src,
        count
    };
}

function main() {
    const { files, outDir } = parseArgs(process.argv);
    const targets = files.length ? files : DEFAULT_FILES;
    const resolved = targets.map((f) => path.resolve(process.cwd(), f));

    for (const filePath of resolved) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Missing file: ${filePath}`);
        }
    }

    fs.mkdirSync(outDir, { recursive: true });

    for (const filePath of resolved) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const { code, count } = injectFunctionHits(raw);
        const outName = path.basename(filePath, path.extname(filePath)) + '.instrumented.js';
        const outPath = path.join(outDir, outName);
        fs.writeFileSync(outPath, code, 'utf8');
        console.log(`${path.relative(process.cwd(), outPath)}  instrumented_calls=${count}`);
    }

    console.log('');
    console.log('Runtime usage object: __DTU_USAGE__');
    console.log('Top hits: __DTU_USAGE__.dump().slice(0, 50)');
    console.log('Reset hits: __DTU_USAGE__.reset()');
}

main();

