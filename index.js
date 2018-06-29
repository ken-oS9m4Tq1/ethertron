const say = console.log;

const readline = require('readline');
var Writable = require('stream').Writable;
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const numstr = require('utils-numstr');
const rlp = require('rlp');
const secp256k1 = require('secp256k1/elliptic');
const keccak = require('keccak');
const scrypt = require('scrypt');

const config = require('./config');
const consts = require('./constants');




//Basic utils>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/* Get an input from the user.
**
** @param {string} prompt - Prints to screen, prompting user input.
** @return {string} The user input as a string.
*/
function ask(prompt) {return new Promise(resolve => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(prompt, response => {
    resolve(response);
    rl.close();
  });
})}

/* Get an input from the user and do not echo.
**
** @param {string} prompt - Prints to screen, prompting user input.
** @return {string} The user input as a string.
*/
function askSecret(prompt) {return new Promise(resolve => {
  
  let output = new Writable({
    write: function(chunk, enc, callback) {
      if (!this.muted) process.stdout.write(chunk, enc);
      callback();
    }
  });

  output.muted = false;
  const rl = readline.createInterface({
    input: process.stdin,
    output: output,
    terminal: true,
  });
  rl.question(prompt, response => {
    say();
    resolve(response);
    rl.close();
  });
  output.muted = true;
})}

/* Get a password input from the user.
**
** @param {bool} skipConfirm - True to skip password confirmation.
** @return {buffer} The password as a buffer.
*/
async function askPassword(skipConfirm = false, inputPrompt, confirmPrompt, failMsg) {
  if (inputPrompt == undefined) inputPrompt = 'Enter password: ';
  if (confirmPrompt == undefined) confirmPrompt = 'Confirm password: ';
  if (failMsg == undefined) failMsg = '\nShaka, when the walls fell.\nThe beast at Tanagra.\n';

  let password;
  do {
    password = await askSecret(inputPrompt);
  } while (!password)
  if (!skipConfirm) {
    let confirm = await askSecret(confirmPrompt);
    if (password != confirm) {
      say(failMsg);
      return askPassword(skipConfirm, inputPrompt, confirmPrompt, failMsg);
    }
  }
  return Buffer.from(password);
}

function sayWrongPassword(accountFile) {
  say('\nIncorrect password and/or keyfile for account ' + accountFile + '.');
}

/* Display all hash functions available for use in the crypto library.
** Each function is displayed alongside its array index.
**
*/
function printHashes(showIndicies = true) {
  say('\nAvailable hashes:\n');

  const col = 3;
  let hashArr = crypto.getHashes();
  hashArr.forEach((hash, index) => {
    if (showIndicies) say(index.toString().padEnd(col), hash);
    else say(hash);
  })
}

/* Print a list of Buffer-friendly character encodings.
**
*/
function printAvailableEnc() {
  say('\nAcceptable character encodings:\n');

  for (let i = 0; i < consts.encoding.length; i++) {
    say('\'' + consts.encoding[i] + '\'');
  }
}

/* Check if an item matches at least one element of a given array.
**
** @param {*} item - The item to test.
** @param {*[]} list - The array to test against.
** @return {bool} True if the item is on the list, false otherwise.
*/
function isOnList(item, list) {
  return (list.indexOf(item) >= 0);
}

/* Turn a json file into an object using JSON.parse.
**
** @param {string|buffer|URL|integer} file - The path/filename of the json file.
** @return {object} The object resulting from the parse.
*/
function getObj(file) {
  return JSON.parse(fs.readFileSync(file));
}

/* Write an object to a file in json format.
**
** @param {object} obj - The object to be written.
** @param {string|buffer|URL|integer} file - The path/filename to which the file will be written.
*/
function writeObj(obj, file) {
  fs.writeFileSync(file, JSON.stringify(obj));
}


//Ethereum-specific utils>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/* Convert to wei a value given in some units.
** The value must be number in base 10 represented as a string. Numbers with decimal points are supported.
** After conversion to wei, any remaining fractional part of the value will be discarded.
** The units must be among those listed in consts.unitMap.
**
** @param {string} value - The value to be converted.
** @param {string} units - The units of the value to be converted.
** @return {string} The value expressed in wei. Undefined if error.
*/
function toWei(val, units) {
  if (!numstr.isNumStr(val, 10, true)) {
    throw new Error('in toWei, \'val\' must be a base 10 number string.');
  }

  if (!isOnList(units, Object.keys(consts.unitMap))) {
    throw new Error('in toWei, \'units\' must be valid units.');
  }

  val = numstr.rectify(val);
  if (val == '0' || units == 'noether') return '0';

  let neg = (val[0] == '-');
  let abs = neg ? val.slice(1) : val;
  if (neg) return ('-' + toWei(abs));

  // Split the number into integer and fractional parts.
  let absSplit = abs.split('.');
  let integerPart = absSplit[0] || '';
  let fractionalPart = absSplit[1] || '';

  // Determine the integer power of 10 'n' indicated by 'units'.
  let unitsInWei = consts.unitMap[units];
  let n = unitsInWei.length - 1;

  // Transfer 'n' digits from the fractional part to the integer part.
  // Pad the fractional part if it's too short.
  fractionalPart = fractionalPart.padEnd(n, '0');
  let valueInWei = integerPart + fractionalPart.slice(0, n);

  return valueInWei;
}

/* Print a list of ethereum units.
**
*/
function printUnitMap() {
  say('\nAcceptable units:\n')

  // Get the list of units.
  let unit = Object.keys(consts.unitMap);

  // Print units in neat columns alongside the unit value in wei.
  for (let i = 0; i < unit.length; i++) {
    // Get unit name and wei equivalent.
    let unitName = unit[i];
    let weiValue = consts.unitMap[unit[i]];

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

//Core functions>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/* Generate a cryptographically secure random private key.
**
** @return {buffer} a private key
*/
function createPrivateKey() {
  let privateKey = Buffer.alloc(consts.privateKeyBytes);
  do {
    crypto.randomFillSync(privateKey);
  } while (!isValidPrivateKey(privateKey));

  return privateKey;
}

/* Generate an account object in web3 secret storage format and write it to a file.
** If accountFile is null or undefined, the account object is returned but not written.
** If no private key is specified, a random private key is generated.
** 
** @param {string|buffer|URL|integer} accountFile - The path/filename to which the account will be written.
** @param {buffer} passcode - Passed to a kdf to derive the encryption key.
** @param {buffer=} privateKey - The private key for the account.
** @return {object} The account object.
*/
function createAccount(accountFile, passcode, privateKey) {
  privateKey = privateKey || createPrivateKey();
  if (!Buffer.isBuffer(passcode) || !Buffer.isBuffer(privateKey)) throw new Error('in createAccount, data type mismatch.');
  if (!isValidPrivateKey(privateKey)) throw new Error('in createAccount, invalid private key ' + privateKey.toString('hex') + '.');

  let salt = crypto.randomBytes(consts.saltBytes);
  let iv = crypto.randomBytes(consts.ivBytes);

  let kdfparamsObj = createKdfparamsObj(salt);
  let cipherparamsObj = {iv: iv.toString('hex')};
  let cryptoObj = createCryptoObj(kdfparamsObj, cipherparamsObj, passcode, privateKey, salt, iv);
  let accountObj = createAccountObj(cryptoObj, privateKey);

  if (accountFile != null) writeObj(accountObj, accountFile);
  return accountObj;
}

/* Create the kdfparams component of an account object.
**
** @param {buffer} salt
*/
function createKdfparamsObj(salt) {
  let kdfparamsObj = new Object();
  
  if (config.kdf == 'scrypt') Object.assign(kdfparamsObj, config.scrypt);
  else if (config.kdf == 'pbkdf2') Object.assign(kdfparamsObj, config.pbkdf2);
  else throw new Error('in createKdfparams, unsupported kdf ' + config.kdf + '.');
  
  kdfparamsObj.dklen = consts.derivedKeyBytes;
  kdfparamsObj.salt = salt.toString('hex');

  return kdfparamsObj;
}

/* Create the crypto component of an account object.
**
** @param {object} kdfparamsObj
** @param {object} cipherparamsObj
** @param {buffer} passcode
** @param {buffer} privateKey
** @param {buffer} salt
** @param {buffer} iv
*/
function createCryptoObj(kdfparamsObj, cipherparamsObj, passcode, privateKey, salt, iv) {
  let cryptoObj = {
    kdf: config.kdf,
    kdfparams: kdfparamsObj,
    cipher: config.cipher,
    cipherparams: cipherparamsObj,
  };
  
  let derived;
  let keyLength = cryptoObj.kdfparams.dklen;
  if (cryptoObj.kdf == 'pbkdf2') {
    let iter = cryptoObj.kdfparams.c;
    let prf = cryptoObj.kdfparams.prf;
    if (prf == 'hmac-sha256') prf = 'sha256';

    derived = crypto.pbkdf2Sync(passcode, salt, iter, keyLength, prf);
  }
  else if (cryptoObj.kdf == 'scrypt') {
    let N = cryptoObj.kdfparams.n;
    let p = cryptoObj.kdfparams.p;
    let r = cryptoObj.kdfparams.r;

    derived = scrypt.hashSync(passcode, {N: N, p: p, r: r}, keyLength, salt);
  }
  else throw new Error('in createCrypto, unsupported kdf ' + cryptoObj.kdf + '.');

  // actual key is the leftmost 16 bytes of the derived key.
  let cipher = crypto.createCipheriv(cryptoObj.cipher, derived.slice(0, consts.cipherKeyBytes), iv);
  let ciphertext = cipher.update(privateKey);
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  cryptoObj.ciphertext = ciphertext.toString('hex');

  // mac is keccak of: the concatenation of second 16 bytes of the derived key and the ciphertext
  let derivedMac = keccak256(Buffer.concat([derived.slice(16, 32), ciphertext]));
  cryptoObj.mac = derivedMac.toString('hex');

  return cryptoObj;
}

/* Create an account object given its component parts.
**
** @param {object} cryptoObj
** @param {buffer} privateKey
*/
function createAccountObj(cryptoObj, privateKey) {
  let accountObj = {
    crypto: cryptoObj,
    version: 3,
  }

  let id = '';
  for (let i = 0; i < consts.idBytes.length; i++) {
    id += crypto.randomBytes(consts.idBytes[i]).toString('hex');
    if (i + 1 < consts.idBytes.length) id += '-';
  }
  accountObj.id = id;

  let publicKey = secp256k1.publicKeyCreate(privateKey, false);
  accountObj.address = addressFromPublicKey(publicKey).toString('hex');

  return accountObj;
}

/* Hash a file, return a digest.
** 
** @param {string|buffer|URL|integer} file - The path/filename of the file to be hashed.
** @param {string} algorithm - Specify the hash algorithm.
** @param {number} iter - Apply the hash function this many times.
** @return {buffer} The digest.
*/
function hashFile(file, algorithm, iter) {
  if (iter < 0) iter = Math.abs(iter);

  let digest = fs.readFileSync(file); // If iter == 0, return the file unaltered.
  for (let i = 0; i < iter; i++) {
    digest = crypto.createHash(algorithm).update(digest).digest();
  }

  return digest;
}

/* Check if a private key is valid.
**
** @param {buffer} privateKey - The key to be tested.
** @return {bool} true if valid, false otherwise.
*/
function isValidPrivateKey(privateKey) {
  // Only accept buffer data type.
  if (!Buffer.isBuffer(privateKey)) {
    throw new Error('in isValidPrivateKey, \'privateKey\' must be a buffer.');
  }

  // Keys of the wrong length are invalid.
  if (privateKey.length != consts.privateKeyBytes) return false;

  // The numerical value of a private key needs to be greater than zero and less than n.
  let zero = numstr.bufferFromHexStr(consts.zero);
  let n = numstr.bufferFromHexStr(consts.n);
  if (Buffer.compare(privateKey, zero) != 1  || Buffer.compare(privateKey, n) != -1) return false;

  // If you get this far, the key is valid.
  return true;
}

/* Generate a composite passcode from a password and keyfile.
** The result should be fed to a kdf to derive an actual key.
**
** @param {buffer} password - Arbitrary sequence.
** @param {(string|buffer|URL|integer)=} keyfile - The path/filename of the keyfile.
** @param {number=} iter - Hash the keyfile this many times.
** @return {buffer} The passcode, to be passed to a kdf.
*/
function getPasscode(password, keyfile, iter = config.keyfileIter) {
  if (!Buffer.isBuffer(password)) throw new Error('in getPasscode, password must be a buffer.');

  if (keyfile == undefined) return password;
  let hash = hashFile(keyfile, config.keyfileHash, iter);
  if (password.length == 0) return hash;

  let length = Math.max(password.length, hash.length);
  let passcode = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    let passByte = password[i] || 0;
    let hashByte = hash[i] || 0;
    passcode[i] = passByte ^ hashByte;
  }

  return passcode;
}

/* Get the private key from an account keystore.
**
** @param {string|buffer|URL|integer} accountFile - The path/filename of the account keystore.
** @param {buffer} passcode - The passcode for the account keystore file.
** @param {bool=}  testOnly - If true, the private key will not be returned. 
**                            Instead the function will return true on valid passcode, undefined otherwise.
** @return {buffer|bool|undefined} The private key for the account or true if testOnly or undefined if the passcode is invalid.
*/
function getPrivateKey(accountFile, passcode, testOnly = false) {
  if (!Buffer.isBuffer(passcode)) throw new Error('in getPrivateKey, passcode must be a buffer.');

  let accountObj = getObj(accountFile);
  let salt = numstr.bufferFromHexStr(accountObj.crypto.kdfparams.salt);
  let keyLength = accountObj.crypto.kdfparams.dklen;
  let cipher = accountObj.crypto.cipher;
  if (!isOnList(cipher, crypto.getCiphers())) throw new Error ('in getPrivateKey, unrecognized cipher ' + cipher + '.');
  let iv = numstr.bufferFromHexStr(accountObj.crypto.cipherparams.iv);
  let ciphertext = numstr.bufferFromHexStr(accountObj.crypto.ciphertext);
  let mac = numstr.bufferFromHexStr(accountObj.crypto.mac);

  let kdf = accountObj.crypto.kdf;
  let derived;
  if (kdf == 'pbkdf2') {
    let iter = accountObj.crypto.kdfparams.c;
    let prf = accountObj.crypto.kdfparams.prf;
    if (prf == 'hmac-sha256') prf = 'sha256';

    derived = crypto.pbkdf2Sync(passcode, salt, iter, keyLength, prf);
  }
  else if (kdf == 'scrypt') {
    let N = accountObj.crypto.kdfparams.n;
    let p = accountObj.crypto.kdfparams.p;
    let r = accountObj.crypto.kdfparams.r;

    derived = scrypt.hashSync(passcode, {N: N, p: p, r: r}, keyLength, salt);
  }
  else throw new Error('in getPrivateKey, unrecognized key derivation function ' + kdf + '.');

  // mac is the concatenation of second 16 bytes of the derived key and the ciphertext
  let derivedMac = keccak256(Buffer.concat([derived.slice(16, 32), ciphertext]));
  if (Buffer.compare(derivedMac, mac) != 0) return undefined;
  else if (testOnly) return true;

  // actual key is the leftmost 16 bytes of the derived key.
  let decipher = crypto.createDecipheriv(cipher, derived.slice(0, consts.cipherKeyBytes), iv);
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);

  return plaintext;
}

/* Get the public address from an account keystore.
**
** @param {string|buffer|URL|integer} accountFile - The path/filename of the account keystore.
** @return {buffer} The public address of the account.
*/
function getAddress(accountFile) {
  let accountObj = getObj(accountFile);
  let address = Buffer.from(accountObj.address, 'hex');
  return address;
}

/* Encrypt an existing account with a new passcode.
** On mac mismatch the account is left unaltered and the function returns false.
** If currentAcctFile and newAcctFile are the same, the current file will be overwritten.
**
** @param {string|buffer|URL|integer} currentAcctFile - The path/filename of the account to modify.
** @param {buffer} currentPasscode - The passcode that currently unlocks the account.
** @param {string|buffer|URL|integer} newAcctFile - The path/filename to which the updated account will be written.
** @param {buffer} newPasscode - The passcode that will unlock the updated account
** @return {bool} False if currentPasscode is incorrect, true otherwise.
*/
function changePasscode(currentAcctFile, currentPasscode, newAcctFile, newPasscode) {
  let privateKey = getPrivateKey(currentAcctFile, currentPasscode);
  if (privateKey) createAccount(newAcctFile, newPasscode, privateKey);
  return !!privateKey;
}

/* Convert an RLP encoded ethereum transaction into an object containing transaction information.
**
** @param {buffer|string} txRlp - The RLP encoded transaction expressed as a buffer or a hex string.
** @return {object|undefined} The transaction information or undefined.
** @property {buffer} nonce - Transaction index.
** @property {buffer} gasPrice - Gas price in wei.
** @property {buffer} gasLimit - Gas limit.
** @property {buffer} to - Sending to this address.
** @property {buffer} value - Sending this much in wei.
** @property {buffer} data - Arbitrary.
** @property {buffer} v - Recovery ID.
** @property {buffer} r - ECDSA signature.
** @property {buffer} s - ECDSA signature.
** @property {buffer} from - Sending from this address.
*/
function recoverTransaction(txRlp) {
  // Convert to a string if given a buffer, and ensure a 0x prefix.
  if (Buffer.isBuffer(txRlp)) txRlp = txRlp.toString('hex');
  txRlp = numstr.with0x(txRlp);

  // Decode rlp format.
  // This will return an array of buffers, each correspnding to a property of the transaction.
  let txArr = rlp.decode(txRlp);
  
  // If the transaction array has the wrong number of fields, exit.
  if (txArr.length != consts.txFields.length) {
    throw new Error('in recoverTransaction, unexpected number of fields when decoding serialized transaction.');
  }

  // Convert the transaction array to an object with matching property names.
  let txObj = new Object();
  for (let i = 0; i < txArr.length; i++) {
    txObj[consts.txFields[i]] = txArr[i];
  }
  
  // Add chainId.
  let v = parseInt(txObj.v.toString('hex'), 16);
  txObj.chainId = numstr.bufferFromHexStr(Math.floor((v - 35) / 2).toString(16));

  // Add massage hash and sender address.
  let signlessArr = txArr.slice(0, 6);
  signlessArr.push(txObj.chainId);
  signlessArr.push(Buffer.from([]));
  signlessArr.push(Buffer.from([]));
  txObj.messageHash = keccak256(rlp.encode(signlessArr));
  txObj.from = addressFromPublicKey(recoverPublicKey(txObj.messageHash, txObj.v, txObj.r, txObj.s));

  return txObj;
}

/* Obtain the sender public key from a signed ethereum transaction.
**
** @param {buffer} txHash - Message hash. (The keccak256 hash of a prepended RLP serialized ethereum transaction with dummy r, s, and v values.)
** @param {buffer|number} v - ECDSA recovery ID.
** @param {buffer} r - ECDSA signature.
** @param {buffer} s - ECDSA signature.
** @return {buffer} The public key of the sender.
*/
function recoverPublicKey(txHash, v, r, s) {
  if (!Buffer.isBuffer(txHash)) throw new Error('in recoverPublicKey, txHash must be a buffer.')
  if (!Buffer.isBuffer(r) || !Buffer.isBuffer(s)) throw new Error('in recoverPublicKey, ECDSA signature values must be buffers.');
  if (r.length != consts.ECDSAbytes || s.length != consts.ECDSAbytes) throw new Error('in recoverPublicKey, unexpected length for ECDSA signature value.');

  // Convert the recovery ID into a true recovery value: an integer on the interval [0, 3].
  if (Buffer.isBuffer(v)) v = parseInt(v.toString('hex'), 16);
  let recovery;
  if (v < 27) {
    throw new Error('in recoverPublicKey, recovery ID \'v\' out of range.');
  }
  else {
    // The arbitrary value C = 27 was originally added to the recovery id in the eth signing scheme.
    // After EIP155, the value was changed to C = 35 + (2 * chainId).  Hence, odd if v = 0, even if v = 1.
    // The probability that v = 2 or v = 3 is very low and, apparently, neglected in the eth signing scheme.
    v -= 27;
    recovery = v % 2;
  }

  // Obtain the public key.
  const compression = false;
  let signature = Buffer.concat([r, s], 2 * consts.ECDSAbytes);
  let publicKey = secp256k1.recover(txHash, signature, recovery, compression);
  publicKey = publicKey.slice(1); // discard the header.

  return publicKey;
}

/* Calculate the ethereum address that corresponds to a given public key.
**
** @param {buffer} publicKey - The public key. If the key is in compressed form, the header byte (0x02 or 0x03) must be included.
**                             If the key is uncompressed, the header byte is optional and ignored.
** @return {buffer} The address corresponding to the public key, or undefined.
*/
function addressFromPublicKey(publicKey) {
  // Accept only a buffer of appropriate length for publicKey.
  if (!Buffer.isBuffer(publicKey)) {
    throw new Error('in addressFromPublicKey, \'publicKey\' must be a buffer.');
  }
  switch (publicKey.length) {
    case consts.publicKeyBytes: // Uncompressed public key.
    case consts.publicKeyBytes + 1: // Uncompressed public key with header.
    case consts.publicKeyCompressedBytes: // Compressed public key with header.
      break; // Ok length detected.
    default:
      throw new Error('in addressFromPublicKey, unexpected length for public key when converting to address.');
  }
  
  // If the key is uncompressed with a header, discard the header.
  if (publicKey.length == consts.publicKeyBytes + 1) publicKey = publicKey.slice(1);

  // If the key is compressed, convert it to uncompressed.
  if (publicKey.length == consts.publicKeyCompressedBytes) {
    const compressed = true;
    publicKey = secp256k1.publicKeyConvert(publicKey, !compressed);
    publicKey = publicKey.slice(1); // now we can discard the header.
  }

  // To obtain the address take the keccak256 hash of the public key, then truncate the first 12 bytes of the digest.
  const extraBytes = 12;
  let address = keccak256(publicKey).slice(extraBytes);

  return address;
}

/* Generate the keccak256 hash of a message.
** If the message is a string, it is interpreted as ascii bytes.
** If you want hex, convert the message to a buffer first.
**
** @param {buffer|string} message
** @return {buffer} hash digest
*/
function keccak256(message) {
  return keccak('keccak256').update(message).digest();
}

/* Determine if an ethereum address is valid. Verify checksum if mixed case.
**
** @param {string|buffer} address
** @param {bool} vetoChecksum - If true, checksum verification is always skipped.
** @return {bool} True if valid, false otherwise.
*/
function isValidAddress(address, vetoChecksum = false) {
  if (Buffer.isBuffer(address)) {
    if (address.length == consts.addressBytes) return true;
    else return false;
  }

  address = numstr.no0x(address);
  if (address.length != 2 * consts.addressBytes) return false;
  if (/[^0-9a-f]/i.test(address)) return false;
  if (!vetoChecksum && /[a-f]/.test(address) && /[A-F]/.test(address)) {
    return (numstr.with0x(address) === toChecksumAddress(address));
  }

  return true;
}

/* Convert an address to its checksum variant.
**
** @param {string|buffer} address
** @return {string} checksum address
*/
function toChecksumAddress(address) {
  if (!isValidAddress(address, true)) throw new Error('in toChecksumAddress, invalid address');
  if (Buffer.isBuffer(address)) address = address.toString('hex');
  
  address = numstr.no0x(address.toLowerCase());
  let hash = keccak256(address).toString('hex');

  let checksum = '0x';
  for (let i = 0; i < address.length; i++) {
    if (parseInt(hash[i], 16) >= 8) checksum += address[i].toUpperCase();
    else checksum += address[i];
  }

  return checksum;
}


/* Convert human readable transaction parameters to buffers, in preparation for RLP encoding.
**
** @params {object}   txParams        The transaction parameters after vetting via parseTxParams.
** @property {string} nonce             nonce, base 10
** @property {string} gasPriceInWei     gas price in wei, base 10
** @property {string} gasLimit          gas limit, base 10
** @property {string} to                recipient address, 0x optional
** @property {string} valueInWei        amount in wei, base 10
** @property {string} data              arbitrary data string
** @property {string} dataEnc           data character encoding
** @params {number=}  chainId         The blockchain ID for the transaction.
** @return {array}                    A transaction array that is ready for RLP encoding.
*/
function formatTxParams(txParams, chainId = 1) {
  if (!isValidAddress(txParams.to)) throw new Error('in formatTxParams, invalid address.')

  // Convert a decimal number string to a buffer. Zero values convert to null.
  function rlpBufferFromDecimalStr(str) {
    return numstr.bufferFromHexStr(numstr.removeLeadingZeros(numstr.convert(str, 10, 16)));
  }

  let txArr = [];

  // nonce, gasprice, gaslimit, to, value, data
  txArr.push(rlpBufferFromDecimalStr(txParams.nonce));
  txArr.push(rlpBufferFromDecimalStr(txParams.gasPriceInWei));
  txArr.push(rlpBufferFromDecimalStr(txParams.gasLimit));
  txArr.push(numstr.bufferFromHexStr(txParams.to));
  txArr.push(rlpBufferFromDecimalStr(txParams.valueInWei));

  if (txParams.dataEnc == 'hex') txArr.push(numstr.bufferFromHexStr(txParams.data));
  else txArr.push(Buffer.from(txParams.data, txParams.dataEnc));

  // v, r, s
  txArr.push(numstr.bufferFromHexStr(numstr.removeLeadingZeros(chainId.toString(16))));
  txArr.push(Buffer.from([]));
  txArr.push(Buffer.from([]));

  return txArr;
}

/* Generate a signed transaction from a tx object and a private key.
**
** @param {object}    txParams        The transaction parameters after vetting via parseTxParams.
** @property {string} nonce             nonce, base 10
** @property {string} gasPriceInWei     gas price in wei, base 10
** @property {string} gasLimit          gas limit, base 10
** @property {string} to                recipient address, 0x optional
** @property {string} valueInWei        amount in wei, base 10
** @property {string} data              arbitrary data string
** @property {string} dataEnc           data character encoding
** @param {number}    chainId         The blockchain ID for the transaction.
** @param {buffer}    privateKey      The private key of the sending account.
** @return {object}                   Contains the signed RLP encoded transaction and related data.
** @property {array}  txArr             transaction array prior to RLP encoding and signing
** @property {string} messageHash       hash of the RLP encoded txArr
** @property {string} v                 recovery ID
** @property {string} r                 ECDSA signature
** @property {string} s                 ECDSA signature
** @property {string} signedRlp         signed RLP encoded transaction.
*/
function signTransaction(txParams, chainId, privateKey) {
  if (!Number.isInteger(chainId) || chainId < 0) throw new Error('in signTransaction, chainId must be a non-negative integer.')
  if (!Buffer.isBuffer(privateKey)) throw new Error('in signTransaction, privateKey must be a buffer.');

  txArr = formatTxParams(txParams, chainId);
  
  let messageHash = keccak256(rlp.encode(txArr));
  let signature = secp256k1.sign(messageHash, privateKey);
  let r = signature.signature.slice(0, 32);
  let s = signature.signature.slice(32, 64);
  let v = signature.recovery + 35 + (2 * chainId);
  v = numstr.bufferFromHexStr(v.toString(16));

  let signedArr = txArr.slice(0, 6);
  signedArr.push(v);
  signedArr.push(r);
  signedArr.push(s);

  let signedRlp = rlp.encode(signedArr);

  return {
    txArr: txArr,
    messageHash: numstr.with0x(messageHash.toString('hex')),
    v: numstr.with0x(v.toString('hex')),
    r: numstr.with0x(r.toString('hex')),
    s: numstr.with0x(s.toString('hex')),
    signedRlp: numstr.with0x(signedRlp.toString('hex')),
  }
}


//Export module>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


module.exports = {
  ask:                  ask,
  askSecret:            askSecret,
  askPassword:          askPassword,
  sayWrongPassword:     sayWrongPassword,
  printHashes:          printHashes,
  printAvailableEnc:    printAvailableEnc,
  isOnList:             isOnList,
  getObj:               getObj,
  toWei:                toWei,
  printUnitMap:         printUnitMap,
  writeObj:             writeObj,
  hashFile:             hashFile,
  isValidPrivateKey:    isValidPrivateKey,
  getPasscode:          getPasscode,
  getPrivateKey:        getPrivateKey,
  getAddress:           getAddress,
  createAccount:        createAccount,
  changePasscode:       changePasscode,
  signTransaction:      signTransaction,
  recoverTransaction:   recoverTransaction,
  recoverPublicKey:     recoverPublicKey,
  addressFromPublicKey: addressFromPublicKey,
  keccak256:            keccak256,
  isValidAddress:       isValidAddress,
  toChecksumAddress:    toChecksumAddress,
  formatTxParams:       formatTxParams,
  createPrivateKey:     createPrivateKey,

  consts: consts,
  config: config,
}

