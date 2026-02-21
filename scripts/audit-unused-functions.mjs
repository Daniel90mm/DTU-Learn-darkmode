#!/usr/bin/env node
/**
 * Heuristic unused-function audit for large plain-JS files.
 *
 * Why heuristic:
 * - No build step / AST deps in this repo.
 * - Dynamic calls (window[name], eval-like flows, event wiring in strings) can exist.
 *
 * Output tiers:
 * - high: declaration name appears exactly once (declaration only).
 * - medium: declaration name appears twice (often declaration + one use, but can still be suspicious).
 *
 * Usage:
 *   node scripts/audit-unused-functions.mjs
 *   node scripts/audit-unused-functions.mjs darkmode.js
 *   node scripts/audit-unused-functions.mjs --json
 *   node scripts/audit-unused-functions.mjs --include-medium
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_FILES = ['darkmode.js', 'background.js'];

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripCommentsAndStrings(input) {
    // Keep string length stable (replace with spaces), so indices still map to lines.
    const out = input.split('');
    const len = input.length;
    let i = 0;
    let state = 'code';
    while (i < len) {
        const ch = input[i];
        const next = i + 1 < len ? input[i + 1] : '';

        if (state === 'code') {
            if (ch === '/' && next === '/') {
                out[i] = ' ';
                out[i + 1] = ' ';
                i += 2;
                state = 'line_comment';
                continue;
            }
            if (ch === '/' && next === '*') {
                out[i] = ' ';
                out[i + 1] = ' ';
                i += 2;
                state = 'block_comment';
                continue;
            }
            if (ch === "'") {
                out[i] = ' ';
                i++;
                state = 'single_quote';
                continue;
            }
            if (ch === '"') {
                out[i] = ' ';
                i++;
                state = 'double_quote';
                continue;
            }
            if (ch === '`') {
                out[i] = ' ';
                i++;
                state = 'template';
                continue;
            }
            i++;
            continue;
        }

        if (state === 'line_comment') {
            if (ch === '\n') {
                state = 'code';
            } else {
                out[i] = ' ';
            }
            i++;
            continue;
        }

        if (state === 'block_comment') {
            if (ch === '*' && next === '/') {
                out[i] = ' ';
                out[i + 1] = ' ';
                i += 2;
                state = 'code';
            } else {
                out[i] = ch === '\n' ? '\n' : ' ';
                i++;
            }
            continue;
        }

        if (state === 'single_quote') {
            out[i] = ch === '\n' ? '\n' : ' ';
            if (ch === '\\') {
                if (i + 1 < len) {
                    out[i + 1] = input[i + 1] === '\n' ? '\n' : ' ';
                }
                i += 2;
                continue;
            }
            if (ch === "'") {
                state = 'code';
            }
            i++;
            continue;
        }

        if (state === 'double_quote') {
            out[i] = ch === '\n' ? '\n' : ' ';
            if (ch === '\\') {
                if (i + 1 < len) {
                    out[i + 1] = input[i + 1] === '\n' ? '\n' : ' ';
                }
                i += 2;
                continue;
            }
            if (ch === '"') {
                state = 'code';
            }
            i++;
            continue;
        }

        if (state === 'template') {
            out[i] = ch === '\n' ? '\n' : ' ';
            if (ch === '\\') {
                if (i + 1 < len) {
                    out[i + 1] = input[i + 1] === '\n' ? '\n' : ' ';
                }
                i += 2;
                continue;
            }
            if (ch === '`') {
                state = 'code';
            }
            i++;
            continue;
        }
    }
    return out.join('');
}

function indexToLine(raw, idx) {
    let line = 1;
    for (let i = 0; i < idx && i < raw.length; i++) {
        if (raw[i] === '\n') line++;
    }
    return line;
}

function findPrevNonWsChar(raw, startIdx) {
    for (let i = startIdx; i >= 0; i--) {
        const ch = raw[i];
        if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') continue;
        return ch;
    }
    return '';
}

function findMatchingBrace(raw, openIdx) {
    let depth = 0;
    let state = 'code';
    for (let i = openIdx; i < raw.length; i++) {
        const ch = raw[i];
        const next = i + 1 < raw.length ? raw[i + 1] : '';

        if (state === 'code') {
            if (ch === '/' && next === '/') {
                state = 'line_comment';
                i++;
                continue;
            }
            if (ch === '/' && next === '*') {
                state = 'block_comment';
                i++;
                continue;
            }
            if (ch === "'") {
                state = 'single_quote';
                continue;
            }
            if (ch === '"') {
                state = 'double_quote';
                continue;
            }
            if (ch === '`') {
                state = 'template';
                continue;
            }
            if (ch === '{') {
                depth++;
                continue;
            }
            if (ch === '}') {
                depth--;
                if (depth === 0) return i;
                continue;
            }
            continue;
        }

        if (state === 'line_comment') {
            if (ch === '\n') state = 'code';
            continue;
        }
        if (state === 'block_comment') {
            if (ch === '*' && next === '/') {
                state = 'code';
                i++;
            }
            continue;
        }
        if (state === 'single_quote') {
            if (ch === '\\') {
                i++;
                continue;
            }
            if (ch === "'") state = 'code';
            continue;
        }
        if (state === 'double_quote') {
            if (ch === '\\') {
                i++;
                continue;
            }
            if (ch === '"') state = 'code';
            continue;
        }
        if (state === 'template') {
            if (ch === '\\') {
                i++;
                continue;
            }
            if (ch === '`') state = 'code';
            continue;
        }
    }
    return -1;
}

function looksLikeNamedIife(raw, fnStartIdx) {
    // Heuristic: (function name(...) { ... })(); or (function name(...) { ... }());
    const prev = findPrevNonWsChar(raw, fnStartIdx - 1);
    if (prev !== '(') return false;

    const openBrace = raw.indexOf('{', fnStartIdx);
    if (openBrace < 0) return false;
    const closeBrace = findMatchingBrace(raw, openBrace);
    if (closeBrace < 0) return false;

    let i = closeBrace + 1;
    while (i < raw.length && /\s/.test(raw[i])) i++;
    if (i >= raw.length) return false;

    // Pattern A: })();
    if (raw[i] === ')') {
        i++;
        while (i < raw.length && /\s/.test(raw[i])) i++;
        return raw[i] === '(';
    }

    // Pattern B: }();
    if (raw[i] === '(') return true;
    return false;
}

function collectDeclarations(sanitized, raw) {
    const found = [];
    const seen = new Set();

    const functionDecl = /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
    let m;
    while ((m = functionDecl.exec(sanitized)) !== null) {
        const name = m[1];
        const key = `fn:${name}:${m.index}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const iife = looksLikeNamedIife(raw, m.index);
        found.push({
            kind: 'function',
            name,
            index: m.index,
            line: indexToLine(raw, m.index),
            iife
        });
    }

    const varAssignedFn = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g;
    while ((m = varAssignedFn.exec(sanitized)) !== null) {
        const name = m[1];
        const key = `varfn:${name}:${m.index}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({
            kind: 'var_function',
            name,
            index: m.index,
            line: indexToLine(raw, m.index),
            iife: false
        });
    }

    return found;
}

function countNameRefs(source, name) {
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g');
    let count = 0;
    while (re.exec(source)) count++;
    return count;
}

function analyzeFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const sanitized = stripCommentsAndStrings(raw);
    const decls = collectDeclarations(sanitized, raw);

    const results = decls.map((d) => {
        // Conservative counting on raw source avoids undercount caused by regex/template parsing edge-cases.
        // False positives here are safer (they reduce accidental deletion risk).
        const refs = countNameRefs(raw, d.name);
        let confidence = 'used';
        if (d.iife) confidence = 'iife';
        else if (refs <= 1) confidence = 'high';
        else if (refs === 2) confidence = 'medium';
        return { ...d, refs, confidence };
    });

    return {
        file: filePath,
        totals: {
            declarations: results.length,
            high: results.filter((r) => r.confidence === 'high').length,
            medium: results.filter((r) => r.confidence === 'medium').length,
            iife: results.filter((r) => r.confidence === 'iife').length
        },
        results
    };
}

function parseArgs(argv) {
    const args = argv.slice(2);
    const files = [];
    let json = false;
    let includeMedium = false;
    for (const arg of args) {
        if (arg === '--json') {
            json = true;
            continue;
        }
        if (arg === '--include-medium') {
            includeMedium = true;
            continue;
        }
        files.push(arg);
    }
    return { files, json, includeMedium };
}

function printText(reports, includeMedium) {
    for (const report of reports) {
        console.log(`\n# ${report.file}`);
        console.log(`declarations: ${report.totals.declarations}`);
        console.log(`high-confidence candidates: ${report.totals.high}`);
        console.log(`medium-confidence candidates: ${report.totals.medium}`);
        console.log(`named IIFE (self-executing): ${report.totals.iife}`);

        const high = report.results.filter((r) => r.confidence === 'high');
        if (high.length) {
            console.log('\n[high]');
            for (const r of high) {
                console.log(`- ${r.name} (${r.kind}) line ${r.line} refs=${r.refs}`);
            }
        } else {
            console.log('\n[high]');
            console.log('- none');
        }

        if (includeMedium) {
            const medium = report.results.filter((r) => r.confidence === 'medium');
            console.log('\n[medium]');
            if (!medium.length) {
                console.log('- none');
            } else {
                for (const r of medium) {
                    console.log(`- ${r.name} (${r.kind}) line ${r.line} refs=${r.refs}`);
                }
            }
        }

        const iife = report.results.filter((r) => r.confidence === 'iife');
        if (iife.length) {
            console.log('\n[iife]');
            for (const r of iife) {
                console.log(`- ${r.name} (${r.kind}) line ${r.line} refs=${r.refs}`);
            }
        }
    }

    console.log('\nNotes:');
    console.log('- This is heuristic and may include false positives.');
    console.log('- Only remove high-confidence candidates after runtime verification on target pages.');
}

function main() {
    const { files, json, includeMedium } = parseArgs(process.argv);
    const targetFiles = files.length ? files : DEFAULT_FILES;
    const resolved = targetFiles.map((f) => path.resolve(process.cwd(), f));

    const missing = resolved.filter((p) => !fs.existsSync(p));
    if (missing.length) {
        for (const p of missing) console.error(`Missing file: ${p}`);
        process.exit(1);
    }

    const reports = resolved.map(analyzeFile);
    if (json) {
        console.log(JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));
        return;
    }
    printText(reports, includeMedium);
}

main();
