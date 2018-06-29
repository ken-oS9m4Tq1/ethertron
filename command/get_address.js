const say = console.log;

const path = require('path');
const fs = require('fs');

const et = require('../index.js')

/* Print script usage to screen.
**
*/
function printUsage() {
  say('\nUsage:', path.basename(process.argv[1], '.js'), process.argv[2], '<accountFile> [options]');
}

/* Print script help to screen.
**
*/
function printHelp() {
  printUsage();

  say('\nOptions:');
  say('--help   - Displays this guide.');
}

/* Obtain arguments from the command line.
**
** @return {object} Arguments gathered from the command line will be recorded here.
*/
function getArgs() {
  let args = new Object();

  // Required arguments.
  const shift = et.consts.argShift;
  args.file = process.argv[0 + shift];

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

  //========================================================
  //======================================Required arguments

  // If no file was specified in the command line, exit.
  if (args.file == undefined) {
    printUsage();
    return false;
  }

  // If a non-existant file was specified in the command line, exit.
  if (!fs.existsSync(args.file)) {
    say('\nFile not found:', args.file);
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

  // Get the address of the specified file.
  let address = et.getAddress(args.file);

  // Print the address to screen.
  say('\nAddress for account ' + args.file + ':');
  say(et.toChecksumAddress(address));

  say();
}

module.exports.main = main;