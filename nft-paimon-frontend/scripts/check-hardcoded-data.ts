#!/usr/bin/env tsx

/**
 * Comprehensive Hardcoded & Mock Data Scanner
 *
 * Scans the entire frontend codebase for:
 * 1. MOCK_ constants
 * 2. Hardcoded numbers (amounts, APRs, etc.)
 * 3. Placeholder addresses (0x...0001, 0x...1000)
 * 4. TODO markers for incomplete work
 */

import * as fs from 'fs';
import * as path from 'path';

interface Issue {
  file: string;
  line: number;
  type: 'MOCK_DATA' | 'HARDCODED_NUMBER' | 'PLACEHOLDER_ADDRESS' | 'TODO';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  content: string;
  context: string;
}

const issues: Issue[] = [];

// Patterns to detect
const PATTERNS = {
  mockConstant: /MOCK_[A-Z_]+/g,
  placeholderAddress: /0x0{39}[1-9a-fA-F]|0x[0-9a-fA-F]{3,38}0{3,}/g,
  hardcodedAmount: /(?:amount|value|balance|supply|tvl|apr|apy).*?[:=]\s*[\[\{]?\s*(?:BigInt\()?['"]\d{6,}['"]|(?:amount|value|balance|supply|tvl|apr|apy).*?[:=]\s*\d{4,}/gi,
  todoMarker: /TODO|FIXME|HACK|XXX/gi,
};

// Directories to scan
const SCAN_DIRS = ['src/app', 'src/components', 'src/hooks'];

// Files to exclude
const EXCLUDE_PATTERNS = [
  /__tests__/,
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /node_modules/,
  /\.next/,
  /\.vercel/,
];

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for MOCK_ constants
    const mockMatches = line.match(PATTERNS.mockConstant);
    if (mockMatches) {
      mockMatches.forEach((match) => {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'MOCK_DATA',
          severity: 'HIGH',
          content: match,
          context: line.trim(),
        });
      });
    }

    // Check for placeholder addresses
    const addressMatches = line.match(PATTERNS.placeholderAddress);
    if (addressMatches) {
      // Exclude common test addresses in constants files
      if (!filePath.includes('constants.ts') || !line.includes('// Placeholder')) {
        addressMatches.forEach((match) => {
          issues.push({
            file: filePath,
            line: lineNum,
            type: 'PLACEHOLDER_ADDRESS',
            severity: 'MEDIUM',
            content: match,
            context: line.trim(),
          });
        });
      }
    }

    // Check for hardcoded amounts (more relaxed)
    if (
      /(?:const|let|var)\s+\w+\s*=\s*\d{6,}/.test(line) ||
      /:\s*\d{6,}/.test(line)
    ) {
      // Exclude test files, type definitions, and comments
      if (
        !line.includes('//') &&
        !line.includes('timestamp') &&
        !line.includes('Timestamp') &&
        !line.includes('Date.now') &&
        !line.includes('timeout') &&
        !line.includes('maxHeight') &&
        !line.includes('fontSize')
      ) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'HARDCODED_NUMBER',
          severity: 'MEDIUM',
          content: line.match(/\d{6,}/)?.[0] || '',
          context: line.trim(),
        });
      }
    }

    // Check for TODO markers
    const todoMatches = line.match(PATTERNS.todoMarker);
    if (todoMatches) {
      todoMatches.forEach((match) => {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'TODO',
          severity: 'LOW',
          content: match,
          context: line.trim(),
        });
      });
    }
  });
}

function scanDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (shouldExclude(fullPath)) {
      return;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  });
}

function generateReport() {
  console.log('\n🔍 Hardcoded & Mock Data Scan Report\n');
  console.log('='.repeat(80));

  const groupedIssues = {
    MOCK_DATA: issues.filter((i) => i.type === 'MOCK_DATA'),
    PLACEHOLDER_ADDRESS: issues.filter((i) => i.type === 'PLACEHOLDER_ADDRESS'),
    HARDCODED_NUMBER: issues.filter((i) => i.type === 'HARDCODED_NUMBER'),
    TODO: issues.filter((i) => i.type === 'TODO'),
  };

  // Summary
  console.log('\n📊 Summary:');
  console.log(`  - MOCK Data: ${groupedIssues.MOCK_DATA.length} (HIGH severity)`);
  console.log(
    `  - Placeholder Addresses: ${groupedIssues.PLACEHOLDER_ADDRESS.length} (MEDIUM severity)`
  );
  console.log(
    `  - Hardcoded Numbers: ${groupedIssues.HARDCODED_NUMBER.length} (MEDIUM severity)`
  );
  console.log(`  - TODO Markers: ${groupedIssues.TODO.length} (LOW severity)`);
  console.log(`  - Total: ${issues.length}\n`);

  // Detailed breakdown
  Object.entries(groupedIssues).forEach(([type, typeIssues]) => {
    if (typeIssues.length === 0) return;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n📌 ${type.replace('_', ' ')} (${typeIssues.length} issues)\n`);

    // Group by file
    const byFile = typeIssues.reduce((acc, issue) => {
      const key = issue.file.replace(process.cwd() + '/', '');
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    }, {} as Record<string, Issue[]>);

    Object.entries(byFile).forEach(([file, fileIssues]) => {
      console.log(`\n  📄 ${file}`);
      fileIssues.slice(0, 5).forEach((issue) => {
        console.log(`     Line ${issue.line}: ${issue.context.substring(0, 100)}`);
      });
      if (fileIssues.length > 5) {
        console.log(`     ... and ${fileIssues.length - 5} more`);
      }
    });
  });

  console.log('\n' + '='.repeat(80));

  // High priority files
  const highPriorityFiles = [
    ...new Set(
      issues
        .filter((i) => i.severity === 'HIGH')
        .map((i) => i.file.replace(process.cwd() + '/', ''))
    ),
  ];

  if (highPriorityFiles.length > 0) {
    console.log('\n🚨 HIGH PRIORITY: Files with MOCK data that need immediate attention:');
    highPriorityFiles.forEach((file) => {
      console.log(`   - ${file}`);
    });
  }

  console.log('\n');
}

// Run scan
console.log('Starting comprehensive scan...\n');
SCAN_DIRS.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`Scanning ${dir}...`);
    scanDirectory(fullPath);
  }
});

generateReport();

// Exit with error code if high-severity issues found
const highSeverityCount = issues.filter((i) => i.severity === 'HIGH').length;
if (highSeverityCount > 0) {
  console.log(`❌ Found ${highSeverityCount} high-severity issues.\n`);
  process.exit(1);
} else {
  console.log(`✅ No high-severity issues found.\n`);
  process.exit(0);
}
