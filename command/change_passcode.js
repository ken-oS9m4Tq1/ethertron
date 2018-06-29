const say = console.log;

const fs = require('fs');
const path = require('path');

const numstr = require('utils-numstr');
const et = require('../index');

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
  say('--help              - Displays this guide.');
  say('--passnew <string>  - Specify new account password.');
  say('--passold <string>  - Specify current account password.');
  say('--keyfilenew <file> - Specify new keyfile.');
  say('--keyfileold <file> - Specify current keyfile.');
  say('--nopassnew         - Force empty password for new account.');
  say('--nopassold         - Force empty password for current account.');
  say('--filenew <file>    - Save the account to a new file after updating the passcode. The original file will not be deleted.');
  say('--verbose           - Enable verbose mode. Warning: verbose mode will display sensitive information.');
  say('--iterold <int>     - Specify the number of hash iterations for the old keyfile.');
  say('--iternew <int>     - Specify the number of hash iterations for the new keyfile.');
}


/* Obtain arguments from the command line.
**
** @return {object} Arguments gathered from the command line will be recorded here.
*/
function getArgs() {
  let args = new Object();
  args.current = new Object();
  args.updated = new Object();

  // Required arguments.
  const shift = et.consts.argShift;
  args.current.file = process.argv[0 + shift];

  // Optional arguments.
  process.argv.forEach((arg, index) => {
    if (arg == '--help') args.help = true;
    else if (arg == '--nopassnew' || arg == '-n') args.updated.nopass = true;
    else if (arg == '--nopassold' || arg == '-N') args.current.nopass = true;
    else if (arg == '--verbose' || arg == '-v' || arg == '-V') args.verbose = true;
    else if (arg == '--passnew' || arg == '-p') args.updated.password = process.argv[index + 1];
    else if (arg == '--passold' || arg == '-P') args.current.password = process.argv[index + 1];
    else if (arg == '--filenew' || arg == '-f') args.updated.file = process.argv[index + 1];
    else if (arg == '--iternew' || arg == '-i') args.updated.iter = process.argv[index + 1];
    else if (arg == '--iterold' || arg == '-I') args.current.iter = process.argv[index + 1];
    else if (arg == '--keyfilenew' || arg == '-k') args.updated.keyfile = process.argv[index + 1];
    else if (arg == '--keyfileold' || arg == '-K') args.current.keyfile = process.argv[index + 1];
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

  // args.verbose should be either true or false.
  if (args.verbose == undefined) args.verbose = false;

  // args.nopass should be either true or false.
  if (args.nopass == undefined) args.nopass = false;

  //========================================================
  //======================================Required arguments

  // If no file was specified in the command line, exit.
  if (args.current.file == undefined) {
    printUsage();
    return false;
  }

  // If a non-existant file was specified in the command line, exit.
  if (!fs.existsSync(args.current.file)) {
    say('\nFile not found:', args.current.file);
    return false;
  }

  //========================================================
  //======================================Optional: password

  // If nopass use an empty password.
  // If specified, convert to buffer.
  // If undefined, keep it undefined.

  if (args.current.nopass) args.current.password = Buffer.from([]);
  else if (args.current.password != undefined) args.current.password = Buffer.from(args.current.password);

  if (args.updated.nopass) args.updated.password = Buffer.from([]);
  else if (args.updated.password != undefined) args.updated.password = Buffer.from(args.updated.password);

  //========================================================
  //=======================================Optional: keyfile

  // If no current keyfile was specified, leave args.current.keyfile undefined.
  // If a non-existant current keyfile was specified in the command line, exit.
  if (args.current.keyfile != undefined && !fs.existsSync(args.current.keyfile)) {
    say('\nFile not found:', args.current.keyfile);
    return false;
  }

  // If no updated keyfile was specified, leave args.updated.keyfile undefined.
  // If a non-existant updated keyfile was specified in the command line, exit.
  if (args.updated.keyfile != undefined && !fs.existsSync(args.updated.keyfile)) {
    say('\nFile not found:', args.updated.keyfile);
    return false;
  }

  //========================================================
  //=======================================Optional: filenew

  // If an existing file was specified, warn the user.
  if (args.updated.file != undefined && fs.existsSync(args.updated.file)) {
    say('\nWarning! Existing file will be overwritten:', args.updated.file);
    let overwriteOk = await et.ask('Continue? (y/N) ');
    overwriteOk = overwriteOk.toLowerCase();
    if (overwriteOk != 'y') return false;
  }

  // If no updated file was specified, then the current file will be overwritten.
  if (args.updated.file == undefined) args.updated.file = args.current.file;

  //========================================================
  //====================================Optional: Iterations

  // If no iterations were specified in the command line, use the default number of iterations.
  if (args.current.iter == undefined) args.current.iter = et.config.keyfileIter;
  if (args.updated.iter == undefined) args.updated.iter = et.config.keyfileIter;

  // If a non-number was assigned to current.iter in the command line, exit.
  if (isNaN(parseInt(args.current.iter, 10))) {
    say('\nNaN:', args.current.iter);
    return false;
  }

  // If a non-number was assigned to updated.iter in the command line, exit.
  if (isNaN(parseInt(args.updated.iter, 10))) {
    say('\nNaN:', args.updated.iter);
    return false;
  }
  
  // Convert iter to a number if it is a string.
  args.current.iter = parseInt(args.current.iter, 10);
  args.updated.iter = parseInt(args.updated.iter, 10);
  
  // If you have made it this far, the arguments are good.
  return true;
}

/* Verbose output. Compare the old account with the updated account.
**
** @param {object} current - Info from the original account file.
** @param {object} updated - Info from the updated account file.
*/
function compare(current, updated) {
  // Compare the old and new files.

  say('\n\n\nOld file: ' + current.file);
  say('New file: ' + updated.file);

  say('\nCompare addresses:');
  say(et.toChecksumAddress(current.accountObj.address));
  say(et.toChecksumAddress(updated.accountObj.address));

  say('\nCompare private keys:');
  say(numstr.with0x(current.privateKey.toString('hex')));
  say(numstr.with0x(updated.privateKey.toString('hex')));

  say('\nCompare passcodes:');
  say(numstr.with0x(current.passcode.toString('hex')));
  say(numstr.with0x(updated.passcode.toString('hex')));

  say('\nCompare accounts:');
  say('Old account: ');
  say(current.accountObj);
  say('New account: ');
  say(updated.accountObj);
}

async function main() {
  // Get parameters from command line arguments.
  let args = getArgs();
  let goodArgs = await parseArgs(args);
  if (!goodArgs) {
    say();
    return;
  }

  // Get private key.
  let current = Object.assign({}, args.current);
  let currentPrompt = 'Enter current password: ';
  if (!current.password) {
    say();
    current.password = await et.askPassword(true, currentPrompt);
  }
  current.passcode = et.getPasscode(current.password, current.keyfile, current.iter);
  let privateKey = et.getPrivateKey(current.file, current.passcode);
  if (!privateKey) {
    et.sayWrongPassword(current.file);
    say();
    return;
  }

  // Generate new passcode.
  let updated = Object.assign({}, args.updated);
  let updatedPrompt = 'Specify new password: ';
  let updatedConfirm = 'Confirm new password: ';
  let updatedFail = '\nEntries do not match.\nReenter new password.\n';
  if (!updated.password) {
    say();
    updated.password = await et.askPassword(false, updatedPrompt, updatedConfirm, updatedFail);
  }
  updated.passcode = et.getPasscode(updated.password, updated.keyfile, updated.iter);

  // Get info on the current file before changing the passcode (in case the file is overwritten).
  if (args.verbose) {
    current.accountObj = et.getObj(current.file);
    current.privateKey = privateKey;
  }

  // Write a new account file using the new passcode.
  et.createAccount(updated.file, updated.passcode, privateKey);

  // Say some information.
  const colWidth = 25;
  say('\nAltered passcode parameters:');
  if (current.file == updated.file) say ('Account file:'.padEnd(colWidth), current.file);
  else say('Previous account file:'.padEnd(colWidth), current.file);
  if (current.password.length > 0) say('Previous password:'.padEnd(colWidth), '*****');
  if (current.keyfile != undefined) say('Previous keyfile:'.padEnd(colWidth), current.keyfile);
  if (current.file != updated.file) say('New account file:'.padEnd(colWidth), updated.file);
  if (updated.password.length > 0) say('New password:'.padEnd(colWidth), '*****');
  if (updated.keyfile != undefined) say('New keyfile:'.padEnd(colWidth), updated.keyfile);
  say('\nPasscode successfully updated!');
  

  if (args.verbose) {
    // Now that the updated file is written, we can get its info also.
    updated.accountObj = et.getObj(updated.file);
    updated.privateKey = et.getPrivateKey(updated.file, updated.passcode);
    // Verbose output.
    let sureAboutVerbose = await et.ask('\nVerbose mode will display sensitive information. Are you sure you want to continue? (y/N) ');
    if (sureAboutVerbose.toLowerCase() == 'y') compare(current, updated);
    else say('Verbose output cancelled.');
  }

  say('');
}


module.exports.main = main;