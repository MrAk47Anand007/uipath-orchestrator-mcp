#!/usr/bin/env node
import dotenv from 'dotenv';
import {
  runDoctorCommand,
  runInitCommand,
  runLoginCommand,
  runLogoutCommand,
  runServeCommand,
  runWhoAmICommand,
} from './cli.js';
import { loadConfig } from './config.js';

dotenv.config();

const command = process.argv[2] ?? 'serve';

switch (command) {
  case 'init':
    await runInitCommand();
    break;
  case 'doctor':
    await runDoctorCommand();
    break;
  case 'login':
    await runLoginCommand(loadConfig());
    break;
  case 'logout':
    await runLogoutCommand(loadConfig());
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
