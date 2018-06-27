const constants = {
  // Expected length in bytes for a private key.
  privateKeyBytes: 32,
  // Expected length in bytes for ECDSA signature values r and s.
  ECDSAbytes: 32,
  // Expected lengths in bytes for a public key.
  publicKeyBytes: 64,
  publicKeyCompressedBytes: 33,
  // Expected length in bytes for an address.
  addressBytes: 20,
  // Expected length in bytes for the symmetric cipher key when encrypting/decrypting private keys.
  cipherKeyBytes: 16,
  // Length in bytes for a kdf derived key.
  derivedKeyBytes: 32,
  // Length in bytes for salt and iv.
  saltBytes: 32,
  ivBytes: 16,
  // Length in bytes for web3 storage id.
  idBytes: [4, 2, 2, 2, 6],
  // Integer order of G for secp256k1.
  n: 'ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141',
  // Zero in the length of 32 hex bytes.
  zero: '00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000',
  // Allowed character encodings when converting to and from binary data.
  encoding: ['ascii', 'utf8', 'utf-8', 'utf16le', 'utf-16le', 'ucs2', 'ucs-2', 'base64', 'latin1', 'binary', 'hex'],
  // Ethereum unit map.
  unitMap: { 
    noether:                              '0',
    wei:                                  '1',
    kwei:                              '1000',
    Kwei:                              '1000',
    babbage:                           '1000',
    femtoether:                        '1000',
    mwei:                           '1000000',
    Mwei:                           '1000000',
    lovelace:                       '1000000',
    picoether:                      '1000000',
    gwei:                        '1000000000',
    Gwei:                        '1000000000',
    shannon:                     '1000000000',
    nanoether:                   '1000000000',
    nano:                        '1000000000',
    szabo:                    '1000000000000',
    microether:               '1000000000000',
    micro:                    '1000000000000',
    finney:                '1000000000000000',
    milliether:            '1000000000000000',
    milli:                 '1000000000000000',
    ether:              '1000000000000000000',
    kether:          '1000000000000000000000',
    grand:           '1000000000000000000000',
    mether:       '1000000000000000000000000',
    gether:    '1000000000000000000000000000',
    tether: '1000000000000000000000000000000' 
  },
  // Alphabet for numbers of arbitrary base.
  alphabet: [ 
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z' 
  ],
  // An ethereum rlp encoded transaction has the following properties, in this order.
  txFields: ['nonce', 'gasPrice', 'gasLimit', 'to', 'value', 'data', 'v', 'r', 's']
}


module.exports = constants;