import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config();

const REQUIRED_FILES = [
  '.agent/index.ts',
  '.agent/watcher.ts',
  '.agent/patcher.ts',
  '.agent/validator.ts',
  '.agent/refiner.ts',
  '.agent/rollback.ts',
  '.agent/cache.ts',
  '.agent/prBot.ts',
  '.agent/sentryHook.ts',
  '.agent/notifier.ts',
  '.agent/config.json',
  '.agent/bus/ui.ts',
  '.agent/bus/api.ts',
  '.agent/bus/db.ts',
  '.agent/bus/perf.ts',
  '.agent/bus/security.ts'
];

const REQUIRED_DIRS = [
  '.agent',
  '.agent/bus',
  '.agent/logs',
  '.agent/learning'
];

function validateStructure(): boolean {
  console.log('🔍 Validating Agent-Zero structure...\n');

  let valid = true;

  console.log('Checking directories...');
  for (const dir of REQUIRED_DIRS) {
    const fullPath = join(process.cwd(), dir);
    if (existsSync(fullPath)) {
      console.log(`  ✅ ${dir}`);
    } else {
      console.log(`  ❌ ${dir} - MISSING`);
      valid = false;
    }
  }

  console.log('\nChecking files...');
  for (const file of REQUIRED_FILES) {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - MISSING`);
      valid = false;
    }
  }

  return valid;
}

function validateTypeScript(): boolean {
  console.log('\n🔧 Running TypeScript compilation check on Agent-Zero files...\n');

  try {
    // Check all TypeScript but filter for Agent-Zero related errors only
    execSync('npx tsc --noEmit', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log('  ✅ TypeScript compilation passed');
    return true;
  } catch (error: any) {
    const output = error.stdout || error.stderr || '';
    
    // Filter to only show .agent and AI script errors
    const lines = output.split('\n');
    const agentErrors = lines.filter((line: string) => 
      line.includes('.agent/') || 
      line.includes('generateDataset.ts') ||
      line.includes('fineTune.ts')
    );

    if (agentErrors.length === 0) {
      console.log('  ✅ Agent-Zero TypeScript files have no errors');
      console.log('  ℹ️  (Other project errors ignored for Agent-Zero validation)');
      return true;
    }

    console.log('  ❌ Agent-Zero TypeScript compilation failed:');
    agentErrors.slice(0, 10).forEach((line: string) => {
      if (line.trim()) {
        console.log(`     ${line}`);
      }
    });
    return false;
  }
}

function validateDependencies(): boolean {
  console.log('\n📦 Checking dependencies...\n');

  const requiredDeps = [
    'chokidar',
    'ts-morph',
    'openai',
    'dotenv',
    'octokit',
    'express',
    'axios'
  ];

  let valid = true;

  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    for (const dep of requiredDeps) {
      if (allDeps[dep]) {
        console.log(`  ✅ ${dep} (${allDeps[dep]})`);
      } else {
        console.log(`  ❌ ${dep} - NOT INSTALLED`);
        valid = false;
      }
    }
  } catch (error) {
    console.log('  ❌ Could not read package.json');
    return false;
  }

  return valid;
}

function validateEnvironment(): boolean {
  console.log('\n🔐 Checking environment variables...\n');

  const requiredEnvVars = ['OPENAI_API_KEY'];
  const optionalEnvVars = ['GITHUB_TOKEN', 'TELEGRAM_TOKEN', 'CHAT_ID', 'SENTRY_WEBHOOK_SECRET'];

  let valid = true;

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`  ✅ ${envVar} - SET`);
    } else {
      console.log(`  ❌ ${envVar} - MISSING (REQUIRED)`);
      valid = false;
    }
  }

  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      console.log(`  ✅ ${envVar} - SET`);
    } else {
      console.log(`  ⚠️  ${envVar} - NOT SET (optional)`);
    }
  }

  return valid;
}

function main(): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║          🤖  AGENT-ZERO VALIDATOR  🤖                   ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const structureValid = validateStructure();
  const depsValid = validateDependencies();
  const envValid = validateEnvironment();
  const tsValid = validateTypeScript();

  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Structure:     ${structureValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Dependencies:  ${depsValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Environment:   ${envValid ? '✅ PASS' : '⚠️  PARTIAL'}`);
  console.log(`TypeScript:    ${tsValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));

  if (structureValid && depsValid && envValid && tsValid) {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║        ✅  AGENTE-ZERO VALIDADO COM SUCESSO! ✅         ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('🚀 You can now run: npx tsx .agent/index.ts\n');
    process.exit(0);
  } else {
    console.log('\n❌ Validation failed. Please fix the issues above.\n');
    process.exit(1);
  }
}

main();
