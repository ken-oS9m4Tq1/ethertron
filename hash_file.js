const say = console.log;

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const numstr = require('utils-numstr');
const et = require('./index.js')


/* Print script usage to screen.
**
*/
function printUsage() {
  say('\nUsage:', path.basename(process.argv[1], '.js'), process.argv[2], '<file> [options]');
}

/* Print script help to screen.
**
*/
function printHelp() {
  printUsage();

  say('\nOptions:');
  say('--help              - Displays this guide.');
  say('--list              - Displays available hashes.');
  say('--hash <hash>       - Determines the hash algorithm.');
  say('--iter <int>        - Determines the number of times the hash is applied.');
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
    else if (arg == '--list') args.list = true;
    else if (arg == '--hash' || arg == '-h') args.hash = process.argv[index + 1];
    else if (arg == '--iter' || arg == '-i') args.iter = process.argv[index + 1];
  })

  return args;
}


async function parseArgs(args) {
  // If --help print the help screen and exit.
  if (args.help) {
    printHelp();
    return false;
  }

  if (args.list) {
    displayHashes();
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

  //========================================================
  //===============================Optional: Hash Iterations
  
  // If no iteration number was specified in the command line, apply the hash once.
  if (args.iter == undefined) args.iter = 1;

  // If a non-number was assigned to iter in the command line, exit.
  if (isNaN(parseInt(args.iter, 10))) {
    say('\nNaN:', args.iter);
    return false;
  }

  // Convert iter to a number if it is a string.
  args.iter = Math.abs(parseInt(args.iter, 10));

  //========================================================
  //================================Optional: Hash Algorithm

  // If an invalid hash was specified in the command line, continue as if no hash were specified.
  let hashArr = crypto.getHashes();
  if (args.hash && !et.isOnList(args.hash, hashArr)) {
    say('\nInvalid hash:', args.hash);
    args.hash = undefined;
  }

  // If no hash (or an invalid hash) was specified in the command line, the user selects a hash.
  if (args.hash == undefined) {
    displayHashes();
    say();
    while (!args.hash) {
      args.hash = hashArr[await et.ask('Index number of the desired algorithm: ')];
    }
  }

  // If you have made it this far, the arguments are good.
  return true;
}


/* Display all hash functions available for use in the crypto library.
** Each function is displayed alongside its array index.
**
*/
function displayHashes() {
  say('\nAvailable hashes:\n');

  const col = 3;
  let hashArr = crypto.getHashes();
  hashArr.forEach((hash, index) => {
    say(index.toString().padEnd(col), hash);
  })
}

async function main() {
  // Get parameters from command line arguments.
  let args = getArgs();
  let goodArgs = await parseArgs(args);
  if (!goodArgs) {
    say();
    return;
  }

  // Get the hash.
  let digest = et.hashFile(args.file, args.hash, args.iter);

  // Print to screen.
  let iterNote = (args.iter != 1) ? '(' + args.iter.toString(10) + ')' : '';
  say('\n' + args.hash + iterNote + ' hash of file ' + args.file + ':');
  say(numstr.with0x(digest.toString('hex')));

  say();
}

module.exports.main = main;