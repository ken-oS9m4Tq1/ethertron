const say = console.log;

const fs = require('fs');
const path = require('path');

const numstr = require('utils-numstr');
const et = require('../index');

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
  say('--pass <string>     - Specify the account password.');
  say('--keyfile <file>    - Specify the account keyfile.');
  say('--nopass            - Force empty password.');
  say('--getkey <file>     - Create the account with the plaintext private key stored in <file>.');
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
    else if (arg == '--getkey' || arg == '-g') args.plainFile = process.argv[index + 1];
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

  // args.nopass should be either true or false.
  if (args.nopass == undefined) args.nopass = false;

  //========================================================
  //======================================Required arguments

  // If no file was specified in the command line, exit.
  if (args.file == undefined) {
    printUsage();
    return false;
  }

  // If an existing file was specified in the command line, warn the user.
  if (fs.existsSync(args.file)) {
    say('\nWarning! Existing file will be overwritten:', args.file);
    let overwriteOk = await et.ask('Continue? (y/N) ');
    if (overwriteOk.toLowerCase() != 'y') return false;
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
  //========================================Optional: getkey

  // If no plaintext file was specified, skip this section.
  if (args.plainFile != undefined) {
    
    // If a non-existant plaintext file was specified, exit.
    if (!fs.existsSync(args.plainFile)) {
      say('\nFile not found:', args.plainFile);
      return false;
    }

    // If a plaintext file was specified but it does not contain a valid private key, exit.
    args.privateKey = privateKeyFromPlaintext(args.plainFile); // returns undefined if key is not valid.
    if (args.privateKey == undefined) {
      say('\nPrivate key is invalid:', args.plainFile);
      return false;
    }
  }
  
  // If you have made it this far, the arguments are good.
  return true;
}

/* Read in from a file: a plaintext private key expressed in utf-8 encoded hex characters.
**
** @param {string|buffer|URL|integer} file - Contains the plaintext private key.
** @return {buffer|undefined} The private key as a byte array, or undefined if the 
**                             file contains anything other than a valid private key.
*/
function privateKeyFromPlaintext(file) {
  keyStr = fs.readFileSync(file, 'utf-8');
  
  let keyBuf = numstr.bufferFromHexStr(keyStr);

  if (!et.isValidPrivateKey(keyBuf)) return undefined;

  return keyBuf;
}

async function main() {

  // Get parameters from command line arguments.
  let args = getArgs();
  let goodArgs = await parseArgs(args);
  if (!goodArgs) {
    say();
    return;
  }

  // Get passcode from the password and keyfile.
  let password = args.password;
  if (!password) {
    say();
    password = await et.askPassword();
  }
  let passcode = et.getPasscode(password, args.keyfile);

  // Create the account.
  let address = et.createAccount(args.file, passcode, args.privateKey).address;

  // Print the address and other info.
  const colWidth = 20;
  say('\nNew account parameters:')
  say('Account file:'.padEnd(colWidth), args.file);
  if (password.length > 0) say('Password:'.padEnd(colWidth), '*****');
  if (args.keyfile != undefined) say('Keyfile:'.padEnd(colWidth), args.keyfile)
  if (args.plainFile != undefined) say('Private key from:'.padEnd(colWidth), args.plainFile);
  say('\nAddress:')
  say(et.toChecksumAddress(address));
  say('\nNew account successfully created!');

  say();
}


module.exports.main = main;


