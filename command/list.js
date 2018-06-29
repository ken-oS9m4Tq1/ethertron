const say = console.log;

const path = require('path');

const et = require('../index.js')


/* Print script usage to screen.
**
*/
function printUsage() {
  say('\nUsage:', path.basename(process.argv[1], '.js'), process.argv[2], '<selection> [options]');
}

/* Print list selections.
**
*/
function printSelections() {
  say('\nAvailable selections:');
  say('units      - List acceptable ethereum units.');
  say('enc        - List acceptable character encodings.');
  say('hashes     - List available hash algorithms');
}

/* Print script help to screen.
**
*/
function printHelp() {
  printUsage();
  printSelections();

  say('\nOptions:');
  say('--help              - Displays this guide.');
}

/* Obtain arguments from the command line.
**
** @return {object} Arguments gathered from the command line will be recorded here.
*/
function getArgs() {
  let args = new Object();

  // Required arguments.
  const shift = et.consts.argShift;
  args.selection = process.argv[0 + shift];

  // Optional arguments.
  process.argv.forEach((arg, index) => {
    if (arg == '--help') args.help = true;
  })

  return args;
}

/* Check the arguments gathered from the command line to ensure they are valid.
** Alter the arguments as necessary for the purposes of the script.
**
** @param {object} args - The arguments gathered from the command line.
** @return {bool} true if the arguments are valid, false otherwise.
*/
function parseArgs(args) {
  // If --help print the help screen and exit.
  if (args.help) {
    printHelp();
    return false;
  }
  
  // If you have made it this far, the arguments are good.
  return true;
}

function main() {
  // Get parameters from command line arguments.
  let args = getArgs();
  let goodArgs = parseArgs(args);
  if (!goodArgs) {
    say();
    return;
  }

  // Print a list.
  switch (args.selection) {
    case 'units':
      et.printUnitMap();
      break;
    case 'enc':
      et.printAvailableEnc();
      break;
    case 'hashes':
      et.printHashes(false);
      break;
    case undefined:
      printUsage();
      printSelections();
      break;
    default:
      say ('\nInvalid selection: ' + args.selection);
      printSelections();
  }

  say();
}

module.exports.main = main;