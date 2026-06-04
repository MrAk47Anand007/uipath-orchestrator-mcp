#!/usr/bin/env node
import dotenv from 'dotenv';
import {
  runDoctorCommand,
  runInitCommand,
  runBrowserLoginCommand,
  runLogoutCommand,
  runServeCommand,
  runServiceLoginCommand,
  runWhoAmICommand,
} from './cli.js';
import { loadConfig } from './config.js';

dotenv.config();

const command = process.argv[2] ?? 'serve';

// Parse simple --flag <value> pairs from argv
function parseFlags(argv: string[]): Record<string, string | true> {
  const flags: Record<string, string | true> = {};
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

switch (command) {
  case 'init':
    await runInitCommand();
    break;
  case 'doctor':
    await runDoctorCommand();
    break;
  case 'login': {
    const flags = parseFlags(process.argv);
    const clientId = typeof flags['client-id'] === 'string' ? flags['client-id'] : undefined;
    const clientSecret = typeof flags['client-secret'] === 'string' ? flags['client-secret'] : undefined;
    const account = typeof flags['account'] === 'string' ? flags['account'] : undefined;
    const tenant = typeof flags['tenant'] === 'string' ? flags['tenant'] : undefined;
    if (clientId && clientSecret) {
      // Headless service-account login — no browser needed
      await runServiceLoginCommand({ clientId, clientSecret, account, tenant });
    } else {
      // Browser-based login — works with ZERO pre-configuration,
      // exactly like `uip login` (uses the built-in UiPath CLI public client)
      await runBrowserLoginCommand();
    }
    break;
  }
  case 'logout':
    await runLogoutCommand();
    break;
  case 'whoami':
    await runWhoAmICommand(loadConfig());
    break;
  case 'serve':
    await runServeCommand();
    break;
  default:
    throw new Error(
      `Unknown command "${command}". Use one of: init, doctor, serve, login, logout, whoami.`,
    );
}
