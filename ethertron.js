#!/usr/bin/env node

const say = console.log;

const path = require('path');

const create_acct = require('./create_acct');
const sign_tx = require('./sign_tx');
const change_passcode = require('./change_passcode');
const get_address = require('./get_address');
const get_priv = require('./get_priv');
const hash_file = require('./hash_file');

/* Print script usage to screen.
**
*/
function printUsage() {
  say('\nUsage:', path.basename(process.argv[1], '.js'), '<command> [options]');
}

/* Print script help to screen.
**
*/
function printHelp() {
  printUsage();

  say('\nAvailable commands:');
  say('create          - Create a new account.');
  say('sign            - Sign a transaction.');
  say('update          - Update the passcode for an account.');
  say('getaddress      - Display the address of an account.');
  say('getkey          - Display the private key of an account.');
  say('hash            - Get the hash of a file.');

  say('\nUse the option --help with any command for specific instructons.');
}

function main() {
  let command = process.argv[2];

  switch (command) {
    case 'create':
    case 'ca':
      create_acct.main();
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
    case 'hash':
    case 'hf':
      hash_file.main();
      break;
    default:
      printHelp();
      say();
  }
}

main();

