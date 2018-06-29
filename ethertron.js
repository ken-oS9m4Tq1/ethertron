#!/usr/bin/env node

const say = console.log;

const path = require('path');

const create_acct = require('./command/create_acct');
const get_template = require('./command/get_template');
const sign_tx = require('./command/sign_tx');
const change_passcode = require('./command/change_passcode');
const get_address = require('./command/get_address');
const get_priv = require('./command/get_priv');
const hash_file = require('./command/hash_file');

/* Print script usage to screen.
**
*/
function printUsage() {
  say('\nUsage:', path.basename(process.argv[1], '.js'), '<command> <args> [options]');
}

/* Print script help to screen.
**
*/
function printHelp() {
  printUsage();

  say('\nAvailable commands:');
  say('create          - Create a new account.');
  say('update          - Update the passcode for an account.');
  say('template        - Create a transaction template.');
  say('sign            - Sign a transaction.');
  say('getaddress      - Display the address of an account.');
  say('getkey          - Display the private key of an account.');
  say('hashfile        - Get the hash of a file.');

  say('\nUse the option --help with any command for specific instructons.');
}

function main() {
  let command = process.argv[2];

  switch (command) {
    case 'create':
    case 'ca':
      create_acct.main();
      break;
    case 'template':
    case 'gt':
      get_template.main();
      break;
    case 'sign':
    case 'st':
      sign_tx.main();
      break;
    case 'update':
    case 'cp':
      change_passcode.main();
      break;
    case 'getaddress':
    case 'ga':
      get_address.main();
      break;
    case 'getkey':
    case 'gp':
      get_priv.main();
      break;
    case 'hashfile':
    case 'hf':
      hash_file.main();
      break;
    default:
      printHelp();
      say();
  }
}

main();

