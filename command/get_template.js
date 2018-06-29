const say = console.log;

const fs = require('fs');
const path = require('path');

const et = require('../index.js')

/* Print script usage to screen.
**
*/
function printUsage() {
  say('\nUsage:', path.basename(process.argv[1], '.js'), process.argv[2], '[options]');
}

/* Print script help to screen.
**
*/
function printHelp() {
  printUsage();

  say('\nOptions:');
  say('--help              - Displays this guide.');
  say('--file <file>       - Specify template filename. Program default is ' + et.consts.defaultTemplate + '.');
}

/* Obtain arguments from the command line.
**
** @return {object} Arguments gathered from the command line will be recorded here.
*/
function getArgs() {
  let args = new Object();

  // Optional arguments.
  process.argv.forEach((arg, index) => {
    if (arg == '--help') args.help = true;
    else if (arg == '--file' || arg == '-f') args.file = process.argv[index + 1];
  })

  return args;
}

/* Check the arguments gathered from the command line to ensure they are valid.
** Alter the arguments as necessary for the purposes of the script.
**
** @param {object} args - The arguments gathered from the command line.
** @return {bool} true if the arguments are valid, false otherwise.
*/
async function parseArgs(args) {
  // If --help print the help screen and exit.
  if (args.help) {
    printHelp();
    return false;
  }

  //========================================================
  //==========================================Optional: file

  // If no file was specified in the command line, assign a default.
  if (args.file == undefined) args.file = et.consts.defaultTemplate;

  // If an existing file was specified in the command line, warn the user.
  if (fs.existsSync(args.file)) {
    say('\nWarning! Existing file will be overwritten:', args.file);
    let overwriteOk = await et.ask('Continue? (y/N) ');
    if (overwriteOk.toLowerCase() != 'y') return false;
  }
  
  // If you have made it this far, the arguments are good.
  return true;
}

async function main() {

  // Get parameters from command line arguments.
  let args = getArgs();
  let goodArgs = await parseArgs(args);
  if (!goodArgs) {
    say();
    return;
  }

  // Copy the tx_params file.
  fs.writeFileSync(args.file, fs.readFileSync(path.join(__dirname, '../tx_params.js')));

  say('\nTemplate file: ' + args.file);
  say('\nTransaction template successfully created!');

  say();
}


module.exports.main = main;
