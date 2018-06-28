const say = console.log;

const fs = require('fs');
const path = require('path');

const numstr = require('utils-numstr');
const et = require('./index');

/* Print script usage to screen.
**
*/
function printUsage() {
  say('\nUsage:', path.basename(process.argv[1], '.js'), process.argv[2], '<txFile> <accountFile> [options]');
}

/* Print script help to screen.
**
*/
function printHelp() {
  printUsage();

  say('\nOptions:');
  say('--help                - Displays this guide.');
  say('--pass <string>       - Specify the account password.');
  say('--keyfile <file>      - Specify the account keyfile.');
  say('--nopass              - Force empty password.')
  say('--chainid <int>       - Specify a blockchain ID for the transaction. Program default is 1 (Ethereum mainnet).');
  say('--verbosity <int>     - Specify a verbosity in the range [-1, 2].');
  say('--verbose             - Force maximum verbosity.');
  say('--iter <int>          - Specify the number of hash iterations for the keyfile.');
}

/* Obtain arguments from the command line.
**
** @return {object} Arguments gathered from the command line will be recorded here.
*/
function getArgs() {
  let args = new Object();

  // Required arguments.
  const shift = et.consts.argShift;
  args.txFile = process.argv[0 + shift];
  args.file = process.argv[1 + shift];

  // Optional arguments.
  process.argv.forEach((arg, index) => {
    if (arg == '--help') args.help = true;
    else if (arg == '--nopass' || arg == '-n') args.nopass = true;
    else if (arg == '--verbose' || arg == '-V') args.verbose = true;
    else if (arg == '--pass' || arg == '-p') args.password = process.argv[index + 1];
    else if (arg == '--keyfile' || arg == '-k') args.keyfile = process.argv[index + 1];
    else if (arg == '--verbosity' || arg == '-v') args.verbosity = process.argv[index + 1];
    else if (arg == '--chainid' || arg == '-c') args.chainId = process.argv[index + 1];
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

  // args.verbose should be either true or false.
  if (args.verbose == undefined) args.verbose = false;

  // args.nopass should be either true or false.
  if (args.nopass == undefined) args.nopass = false;

  //========================================================
  //======================================Required arguments

  // If any required arguments were omitted, exit.
  if (args.txFile == undefined || args.file == undefined) {
    printUsage();
    return false;
  }

  // If a non-existant transaction file was specified in the command line, exit.
  if (!fs.existsSync(args.txFile)) {
    say('\nFile not found:', args.txFile);
    return false;
  }

  // If a non-existant account file was specified in the command line, exit.
  if (!fs.existsSync(args.file)) {
    say('\nFile not found:', args.file);
    return false;
  }

  //--------------------------------------------------------
  //================================================txParams
  
  // Import the transaction parameters and validate them.
  let txParams = require(path.resolve(args.txFile));
  let goodTxParams = parseTxParams(txParams, args.txFile);
  if (!goodTxParams) return false;

  // If you get this far, the transsaction parameters are good.
  // Attach them to the args object.
  args.txParams = txParams;

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
  //=====================================Optional: verbosity

  if (args.verbose) {
    args.verbosity = +Infinity;
  }
  else {
    // Default verbosity is 1.
    if (args.verbosity == undefined) args.verbosity = 1;

    // Exit if verbosity is not a number.
    if (isNaN(parseInt(args.verbosity, 10))) {
      say('\nInvalid verbosity:', args.verbosity);
      say('\nAn integer number is required.');
      return false;
    }

    // Convert verbosity to a number if it is a string.
    args.verbosity = parseInt(args.verbosity, 10);
  }

  //========================================================
  //=======================================Optional: chainId

  // If no chain ID was specified in the command line set it to the Ethereum mainnet ID.
  if (args.chainId == undefined) args.chainId = 1;

  // Convert chainId to a number if it is a string.
  args.chainId = parseInt(args.chainId, 10);

  // If a non-number was assigned to chainId in the command line, exit.
  if (isNaN(args.chainId) || args.chainId < 0) {
    say('\nInvalid chainId:', args.chainId);
    say('\nA positive integer is required.');
    return false;
  }

  //========================================================
  //==========================================Optional: iter

  // If no iterations were specified in the command line, use the default number of iterations.
  if (args.iter == undefined) args.iter = et.config.keyfileIter;

  // If a non-number was assigned to iter in the command line, exit.
  if (isNaN(parseInt(args.iter, 10))) {
    say('\nInvalid iter:', args.iter);
    say('\nAn integer number is required.');
    return false;
  }

  // Convert iter to a number if it is a string.
  args.iter = parseInt(args.iter, 10);
  
  // If you have made it this far, the arguments are good.
  return true;
}

function parseTxParams(txParams, txFile) {
  let errHeader = '\nIn transaction parameter file: ' + txFile;

  //========================================================
  //===============================Validate object structure

  // If the number of properties is incorrect, report.
  const paramsLength = 9; //expected.
  const actualLength = Object.keys(txParams).length;
  let paramsLengthErr = '';
  if (actualLength != paramsLength) {
    paramsLengthErr = 'Invalid number of transaction parameters.';
    paramsLengthErr += '\n  Expected: ' + paramsLength;
    paramsLengthErr += '\n  Found:    ' + actualLength;
  }

  // If any of the expected properties are missing, report.
  let param = ['nonce', 'value', 'gasPrice', 'gasLimit', 'to', 'valueUnits', 'gasPriceUnits', 'data', 'dataEnc']; // expected properties.
  let paramKeysErr = '';
  for (let i = 0; i < param.length; i++) {
    if (txParams[param[i]] == undefined) {
      if (paramKeysErr) paramKeysErr += '\n';
      paramKeysErr += 'Missing transaction parameter: ' + param[i];
    }
  }

  // If any of the parameters are not strings, report.
  let paramTypesErr = '';
  for (let i = 0; i < param.length; i++) {
    if (txParams[param[i]] != undefined && typeof txParams[param[i]] != 'string') {
      if (paramTypesErr) paramTypesErr += '\n';
      paramTypesErr += 'String required for transaction parameter: ' + param[i];
    }
  }
  
  // If any defects were detected in the object structure, exit.
  if (paramsLengthErr || paramKeysErr || paramTypesErr) {
    say(errHeader);
    if (paramsLengthErr) say(paramsLengthErr);
    if (paramKeysErr) say(paramKeysErr);
    if (paramTypesErr) say(paramTypesErr);
    return false;
  }

  //========================================================
  //========================================Validate address

  // Test the address without regard for the checksum.
  if (!et.isValidAddress(txParams.to, true)) {
    say(errHeader);
    say('Invalid address:', txParams.to);
    return false;
  }

  // Test the address checksum, unless the address is all lower- or all upper-case.
  if (!et.isValidAddress(txParams.to)) {
    say(errHeader);
    say('Address checksum failed:', txParams.to);
    say('\nUse all lower-case letters to circumvent checksum.');
    return false;
  }
  
  // If you get this far, the address is good. 
  // Convert the address to its checksum version.
  txParams.to = et.toChecksumAddress(txParams.to);

  //========================================================
  //==========================================Validate units

  // Check that the specified units are on the list.
  let goodUnits = Object.keys(et.consts.unitMap); // valid choices of units.

  // Value units.
  let valueUnitsErr = '';
  if (!et.isOnList(txParams.valueUnits, goodUnits)) {
    valueUnitsErr = 'Invalid units: ' + txParams.valueUnits;
  }

  // Gas price units.
  let gasPriceUnitsErr = '';
  if (!et.isOnList(txParams.gasPriceUnits, goodUnits)) {
    gasPriceUnitsErr = 'Invalid units: ' + txParams.gasPriceUnits;
  }

  // If invalid units were detected, display available units, then exit.
  if (valueUnitsErr || gasPriceUnitsErr) {
    say(errHeader);
    if (valueUnitsErr) say(valueUnitsErr);
    if (gasPriceUnitsErr) say(gasPriceUnitsErr);
    printUnitMap();
    return false;
  }

  // If you get this far, the units are good.

  //========================================================
  //========================================Validate numbers

  // Names for the number parameters.
  const nonceName = param[0];
  const valueName = param[1];
  const gasPriceName = param[2];
  const gasLimitName = param[3];

  // Ensure each number parameter is non-negative base 10 and, if necessary, an integer.
  let nonceErr = inspectNumParam(txParams.nonce, nonceName);
  let gasLimitErr = inspectNumParam(txParams.gasLimit, gasLimitName);
  const decimalPointOk = true;
  let valueErr = inspectNumParam(txParams.value, valueName, decimalPointOk);
  let gasPriceErr = inspectNumParam(txParams.gasPrice, gasPriceName, decimalPointOk);

  // If any number parameters are not correct, report and exit.
  if (nonceErr || gasLimitErr || valueErr || gasPriceErr) {
    say(errHeader);
    if (nonceErr) say(nonceErr);
    if (gasLimitErr) say(gasLimitErr);
    if (valueErr) say(valueErr);
    if (gasPriceErr) say(gasPriceErr);
    return false;
  }

  // Convert eth parameters to wei.
  txParams.valueInWei = et.toWei(txParams.value, txParams.valueUnits);
  txParams.gasPriceInWei = et.toWei(txParams.gasPrice, txParams.gasPriceUnits);

  // If you get this far, the number parameters are good.

  //========================================================
  //==================================Validate data encoding

  if (!et.isOnList(txParams.dataEnc, et.consts.encoding)) {
    say(errHeader);
    say('Invalid character encoding:', txParams.dataEnc);
    printAvailableEnc();
    return false;
  }

  // If you get this far, the transaction parameters are good.
  return true;
}

/* Inspect a transaction parameter string to ensure it represents a number.
**
** @param {string} param - The transaction parameter to inspect.
** @param {string} name - The name of the transaction parameter.
** @param {bool} decimalPointOk - True to allow numbers with a decimal point, false to allow only integers.
** @return {string} Empty string if no errors were detected. Otherwise, a description of the error.
*/
function inspectNumParam(param, name, decimalPointOk = false) {
  // Check that the given parameter looks like a positive base 10 number.
  let paramOk = numstr.isNumStr(param, 10, decimalPointOk);
  if (paramOk && param[0] == '-') paramOk = false;

  // If any defects were detected, report.
  let errStr = '';
  if (!paramOk) {
    errStr = 'Non-negative base 10 '  + (decimalPointOk ? 'number' : 'integer') +  ' required for parameter: ' + name;
  }

  return errStr;
}

/* Print a list of ethereum units.
**
*/
function printUnitMap() {
  say('\nAcceptable units:\n')

  // Get the list of units.
  let unit = Object.keys(et.consts.unitMap);

  // Print units in neat columns alongside the unit value in wei.
  for (let i = 0; i < unit.length; i++) {
    // Get unit name and wei equivalent.
    let unitName = unit[i];
    let weiValue = et.consts.unitMap[unit[i]];

    // Express the wei value in scientific notation.
    let weiValueSci;
    if (weiValue == '0' || weiValue == '1') {
      weiValueSci = weiValue;
    }
    else {
      let pow = weiValue.length - 1;
      weiValueSci = '1e+' + pow.toString();
    }

    // Construct the output for the current table row.
    const col = 15;
    const pad = 5;
    let formattedWeiValue = weiValueSci.padStart(pad);
    if (i == 0) formattedWeiValue += ' wei'; // label wei value units in the first row only.
    let formattedUnitName = '\'' + unitName + '\'';
    formattedUnitName = formattedUnitName.padEnd(col);
    let row = formattedUnitName + formattedWeiValue;

    // Highlight the most common units.
    if (unitName == 'wei' || unitName == 'gwei' || unitName == 'ether') {
      row = '\x1b[92m' + row + '\x1b[0m';
    }

    say(row);
  }
}

/* Print a list of Buffer-friendly character encodings.
**
*/
function printAvailableEnc() {
  say('\nAcceptable character encodings:\n');

  for (let i = 0; i < et.consts.encoding.length; i++) {
    say('\'' + et.consts.encoding[i] + '\'');
  }
}

/* Convert the values from txParams into hex, in preparation for RLP encoding and serialization.
**
** @params {object} txParams - The transaction parameters after vetting via parseTxParams.
** @params {number} chainId - The ID of the blockchain to which the transaction will be broadcast.
** @return {object} A transaction object that is ready for serialization.
** @property {string} nonce - Transaction nonce as a hex string.
** @property {string} chainId - Blockchain ID as a hex string.
** @property {string} to - Recipient address.
** @property {string} value - Transfer amount in wei as a hex string.
** @property {string} gasPrice - Gas price in wei as a hex string.
** @property {string} gas - Gas limit as a hex string.
** @property {string} data - Arbitrary data as a hex string.
*/
function formatTxParams(txParams, chainId = 1) {
  // Format txParams values and assign them to a new object.
  let txHex = new Object();
  txHex.nonce = numstr.with0x(numstr.convert(txParams.nonce, 10, 16));
  txHex.chainId = numstr.with0x(chainId.toString(16));
  txHex.to = numstr.with0x(txParams.to);
  txHex.value = numstr.with0x(numstr.convert(txParams.valueInWei, 10, 16));
  txHex.gasPrice = numstr.with0x(numstr.convert(txParams.gasPriceInWei, 10, 16));
  txHex.gasLimit = numstr.with0x(numstr.convert(txParams.gasLimit, 10, 16));
  txHex.gas = txHex.gasLimit; // remove after migrating sign tx
  txHex.data = numstr.with0x(Buffer.from(txParams.data, txParams.dataEnc).toString('hex'));

  return txHex;
}

/* Convert recovered transaction information into human-readable strings.
** The given object will be modified by the function.
**
** @param {object} txRecovered - The recovered transaction object from function recoverTransaction.
** @property {buffer} nonce - Transaction nonce.
** @property {buffer} gasPrice - Gas price in wei.
** @property {buffer} gasLimit - Gas limit.
** @property {buffer} to - Recipient address.
** @property {buffer} value - Transfer amount in wei.
** @property {buffer} data - Arbitrary data.
** @property {buffer} v - ECDSA recovery ID.
** @property {buffer} r - ECDSA signature.
** @property {buffer} s - ECDSA signature.
** @property {buffer} chainId - Chain ID.
** @property {buffer} messageHash - Hash of the transaction RLP minus signature.
** @property {buffer} from - Sender address.
*/
function formatTxRecovered(txRecovered, dataEnc = 'hex') {

  txRecovered.nonce = numstr.convert(txRecovered.nonce.toString('hex'), 16, 10);
  txRecovered.gasPrice = numstr.convert(txRecovered.gasPrice.toString('hex'), 16, 10);
  txRecovered.gasLimit = numstr.convert(txRecovered.gasLimit.toString('hex'), 16, 10);
  txRecovered.to = et.toChecksumAddress(txRecovered.to.toString('hex'));
  txRecovered.value = numstr.convert(txRecovered.value.toString('hex'), 16, 10);

  txRecovered.data = txRecovered.data.toString(dataEnc);
  if (txRecovered.data.length > 0 && dataEnc == 'hex') txRecovered.data = numstr.with0x(txRecovered.data);

  txRecovered.v = numstr.convert(txRecovered.v.toString('hex'), 16, 10);
  txRecovered.r = numstr.with0x(txRecovered.r.toString('hex'));
  txRecovered.s = numstr.with0x(txRecovered.s.toString('hex'));
  txRecovered.chainId = numstr.convert(txRecovered.chainId.toString('hex'), 16, 10);
  txRecovered.messageHash = numstr.with0x(txRecovered.messageHash.toString('hex'));
  txRecovered.from = et.toChecksumAddress(txRecovered.from.toString('hex'));

}

/* Print the information recovered from an RLP encoded transaction.
**
** @param {object} txRecovered - Transaction object returned by recoverTransaction and formatted by formatTxRecovered.
*/
function printTxRecovered(txRecovered) {
  say('\nTransaction information:');

  pl('To:', txRecovered.to);
  pl('From:', txRecovered.from);
  pl('Nonce:', txRecovered.nonce);
  pl('Chain ID:', txRecovered.chainId);
  pl('Value:', numstr.toSci(txRecovered.value, 3), 'wei');
  pl('Gas Price:', numstr.toSci(txRecovered.gasPrice, 3), 'wei');
  pl('Gas Limit:', txRecovered.gasLimit);
  if (txRecovered.data != '') pl('Data:', txRecovered.data);
}

function printTxSignature(txRecovered) {
  say('\nSignature information:');

  pl('Message Hash:', txRecovered.messageHash);
  pl('v:', txRecovered.v);
  pl('r:', txRecovered.r);
  pl('s:', txRecovered.s);
}

function printTxSigned(txSigned) {
  say('\nSigned transaction:');

  say(txSigned.signedRlp);
}

function pl(field, value, units = '') {
  const col = 18;
  say(field.padEnd(col), value, units);
}

async function main() {
  // Get parameters from command line arguments.
  let args = getArgs();
  let goodArgs = parseArgs(args);
  if (!goodArgs) {
    say();
    return;
  }

  // Generate a signed transaction object.
  let password = args.password;
  if (!password) {
    say();
    password = await et.askPassword(true);
  }
  let passcode = et.getPasscode(password, args.keyfile, args.iter);
  let privateKey = et.getPrivateKey(args.file, passcode);
  if (!privateKey) {
    et.sayWrongPassword(args.file);
    say();
    return;
  }
  let txSigned = et.signTransaction(args.txParams, args.chainId, privateKey);

  // Recover information from the serialized transaction to verify its contents.
  let txRecovered = et.recoverTransaction(txSigned.signedRlp);
  formatTxRecovered(txRecovered, args.txParams.dataEnc);


  // Print the recovered information and serialized transaction.
  if (args.verbosity >= 2) {
    say('\nParsed txParams:');
    say(args.txParams);

    say('\ntxSigned:');
    say(txSigned);

    say('\nFormatted txRecovered:');
    say(txRecovered);
  }

  if (args.verbosity >= 0) printTxRecovered(txRecovered);
  if (args.verbosity >= 1) printTxSignature(txRecovered);
  if (args.verbosity >= 0) printTxSigned(txSigned);
  if (args.verbosity < 0) say(txSigned.signedRlp);

  if (args.verbosity >= 0) say();
}



module.exports.main = main;
