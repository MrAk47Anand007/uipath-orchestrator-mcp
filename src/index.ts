#!/usr/bin/env node
import dotenv from 'dotenv';
import { loadConfig } from './config.js';
import {
  runLoginCommand,
  runLogoutCommand,
  runServeCommand,
  runWhoAmICommand,
} from './cli.js';

dotenv.config();

const command = process.argv[2] ?? 'serve';
const config = loadConfig();

switch (command) {
  case 'login':
    await runLoginCommand(config);
    break;
  case 'logout':
    await runLogoutCommand(config);
    break;
  case 'whoami':
    await runWhoAmICommand(config);
    break;
  case 'serve':
    await runServeCommand();
    break;
  default:
    throw new Error(
      `Unknown command "${command}". Use one of: serve, login, logout, whoami.`,
    );
}
