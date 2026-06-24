#!/usr/bin/env npx tsx
/**
 * Collect all Selemene output files and run batch interpretation.
 *
 * This script:
 * 1. Finds all Selemene output files in test directories
 * 2. Deduplicates by subject (keeps most recent)
 * 3. Runs batch-interpret.ts on the collection
 */

import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════

const SEARCH_DIRS = [
  '/Volumes/madara/2026/twc-vault/01-Projects/723',
  '/Users/sheshnarayaniyer/Downloads/humdes-extractor',
];

const BATCH_DIR = './.batch-inputs';
const OUTPUT_DIR = './.batch-outputs';

// ═══════════════════════════════════════════════════════════════════════
// FILE COLLECTION
// ═══════════════════════════════════════════════════════════════════════

interface SelemeneFile {
  path: string;
  subject: string;
  mtime: number;
}

function findSelemeneFiles(dir: string): SelemeneFile[] {
  const files: SelemeneFile[] = [];

  function walk(currentDir: string) {
    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.includes('selemene') && entry.name.endsWith('.json')) {
          const stat = statSync(fullPath);
          // Extract subject from filename: 01_selemene_subject-name.json
          const match = entry.name.match(/selemene_(.+?)\.json$/);
          const subject = match ? match[1] : entry.name.replace('.json', '');
          files.push({
            path: fullPath,
            subject,
            mtime: stat.mtimeMs,
          });
        }
      }
    } catch (err) {
      // Skip unreadable directories
    }
  }

  walk(dir);
  return files;
}

// ═══════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════

function deduplicate(files: SelemeneFile[]): SelemeneFile[] {
  const bySubject = new Map<string, SelemeneFile>();

  for (const file of files) {
    const existing = bySubject.get(file.subject);
    if (!existing || file.mtime > existing.mtime) {
      bySubject.set(file.subject, file);
    }
  }

  return Array.from(bySubject.values()).sort((a, b) => a.mtime - b.mtime);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

function main() {
  console.log('🔍 Collecting Selemene output files...\n');

  let allFiles: SelemeneFile[] = [];
  for (const dir of SEARCH_DIRS) {
    if (!existsSync(dir)) {
      console.log(`⚠️  Skipping (not found): ${dir}`);
      continue;
    }
    const files = findSelemeneFiles(dir);
    console.log(`📁 ${dir}: ${files.length} files`);
    allFiles.push(...files);
  }

  console.log(`\n📊 Total found: ${allFiles.length} files`);

  // Deduplicate
  const unique = deduplicate(allFiles);
  console.log(`📊 Unique subjects: ${unique.length}`);

  if (unique.length === 0) {
    console.error('❌ No Selemene files found');
    process.exit(1);
  }

  // Copy to batch directory
  mkdirSync(BATCH_DIR, { recursive: true });

  for (const file of unique) {
    const destName = `${file.subject}.json`;
    const destPath = join(BATCH_DIR, destName);
    copyFileSync(file.path, destPath);
  }

  console.log(`\n✅ Copied ${unique.length} files to ${BATCH_DIR}/`);
  console.log('\n📋 Subjects to process:');
  for (const file of unique) {
    console.log(`   - ${file.subject}`);
  }

  console.log(`\n🚀 Run batch processor with:`);
  console.log(`   npx tsx scripts/batch-interpret.ts --dir ${BATCH_DIR} --output ${OUTPUT_DIR}`);
  console.log(`\n   Or with resume support:`);
  console.log(`   npx tsx scripts/batch-interpret.ts --dir ${BATCH_DIR} --output ${OUTPUT_DIR} --resume`);
}

main();
