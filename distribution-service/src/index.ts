import { DistributionOrchestrator } from './orchestrator';

/**
 * Main entry point for distribution service
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npm run snapshot <epoch> <users-file>');
    console.error('Example: npm run snapshot 1 users.json');
    process.exit(1);
  }

  const epoch = parseInt(args[0]);
  const usersFile = args[1];

  try {
    // Load user addresses
    const fs = require('fs');
    const users: string[] = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));

    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Invalid users file format');
    }

    console.log(`Loaded ${users.length} user addresses from ${usersFile}`);

    // Execute distribution
    const orchestrator = new DistributionOrchestrator();
    await orchestrator.execute(epoch, users);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
