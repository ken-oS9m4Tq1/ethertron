const config = {
  // Choose the algorithm for hashing keyfiles.
  keyfileHash: 'sha512',
  // Choose the default number of iterations.
  keyfileIter: 5,
  // Choose a key derivation function ('scrypt' or 'pbkdf2').
  kdf: 'scrypt',
  // Define kdf parameters.
  scrypt: {
    n: 262144,
    p: 1,
    r: 8,
  },
  pbkdf2: { 
    c: 262144,
    prf: 'hmac-sha256',
  },
  // Choose a symmetric cipher.
  cipher: 'aes-128-ctr',
}

module.exports = config;

/*
Keyfiles are hashed to ensure good diffusion.  
The result is combined with a user defined password to generate a passcode.
The passcode is passed to a kdf to derive the actual encryption key.
*/