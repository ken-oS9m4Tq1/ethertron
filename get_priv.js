const say = console.log;

const fs = require('fs');
const path = require('path');

const numstr = require('utils-numstr');
const et = require('./index.js')

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
  say('--pass <string>     - Specify the account password.');
  say('--keyfile <file>    - Specify the account keyfile.');
  say('--nopass            - Force empty password.');
  say('--iter <int>        - Determines the number of times the keyfile is hashed.');
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
    else if (arg == '--nopass' || arg == '-n') args.nopass = true;
    else if (arg == '--pass' || arg == '-p' || arg == '-P') args.password = process.argv[index + 1];
    else if (arg == '--keyfile' || arg == '-k') args.keyfile = process.argv[index + 1];
    else if (arg == '--iter' || arg == '-i') args.iter = process.argv[index + 1];
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

  // args.nopass should be either true or false.
  if (args.nopass == undefined) args.nopass = false;

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
  //======================================Optional: password

  // If nopass use an empty password.
  // If specified, convert to buffer.
  // If undefined, keep it undefined.
  if (args.nopass) args.password = Buffer.from([]);
  else if (args.password != undefined) args.password = Buffer.from(args.password);

  //========================================================
  //=======================================Optional: keyfile

  // If no keyfile was specified, leave args.keyfile undefined.
  // If a non-existant keyfile was specified, exit.
  if (args.keyfile != undefined && !fs.existsSync(args.keyfile)) {
    say('\nFile not found:', args.keyfile);
    return false;
  }

  //========================================================
  //==========================================Optional: iter

  // If no iterations were specified in the command line, use the default number of iterations.
  if (args.iter == undefined) args.iter = et.config.keyfileIter;

  // If a non-number was assigned to iter in the command line, exit.
  if (isNaN(parseInt(args.iter, 10))) {
    say('\nNaN:', args.iter);
    return false;
  }

  // Convert iter to a number if it is a string.
  args.iter = parseInt(args.iter, 10);

  // If you have made it this far, the arguments are good.
  return true;
}

/* Get a private key from an encrypted account keystore file. Print the private key to the screen.
**
*/
async function main() {
  // Get parameters from command line arguments.
  let args = getArgs();
  let goodArgs = parseArgs(args);
  if (!goodArgs) {
    say();
    return;
  }

  // Get passcode.
  let password = args.password;
  if (!password) {
    say();
    password = await et.askPassword(true);
  }
  let passcode = et.getPasscode(password, args.keyfile, args.iter);

  // Get the private key.
  let privateKey = et.getPrivateKey(args.file, passcode);
  if (!privateKey) {
    et.sayWrongPassword(args.file);
    say();
    return;
  }

  // Print it to the screen.
  say('\nPrivate key for account ' + args.file + ':');
  say(numstr.with0x(privateKey.toString('hex')));
  
  say();
}

module.exports.main = main;