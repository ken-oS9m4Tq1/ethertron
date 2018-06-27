# <img src="./icon.png" width="200" /> ethertron

Basic command line tools for managing ethereum accounts and generating transactions offline.

## install

```
npm i ethertron
```

## command line interface

Each command is its own script.  Any command can be called with the option `--help` to display usage and options.  The available commands are:

* create_acct.js
* sign_tx.js
* change_passcode.js
* get_address.js
* get_priv.js
* hash_file.js

### create an account

```
> node .\create_acct.js --help

Usage: node.exe create_acct.js <file> [options]

Options:
--help              - Displays this guide.
--pass <string>     - Specify the account password.
--keyfile <file>    - Specify the account keyfile.
--nopass            - Force empty password.
--getkey <file>     - Create the account with the plaintext private key stored in <file>.

```

You can create an account with a randomly generated private key:

```
> node .\create_acct.js ..\keystore\new.acct

Enter password:
Confirm password:

New account parameters:
Account file:        ..\keystore\new.acct
Password:            *****

Address:
0xfBAf632D16bAd2da3C477e5Ec2044E2Cd104c27e

New account successfully created!

```

Alternatively, you can create an account with a private key obtained from a text file:

```
> cat ..\keystore\privatekey.txt
0x00000005 00000005 00000005 00000005 00000005 00000005 00000005 00000005

> node .\create_acct.js ..\keystore\new.acct --getkey ..\keystore\privatekey.txt

Warning! Existing file will be overwritten: ..\keystore\new.acct
Continue? (y/N) y

Enter password:
Confirm password:

New account parameters:
Account file:        ..\keystore\new.acct
Password:            *****
Private key from:    ..\keystore\privatekey.txt

Address:
0x71eF4E39Afc13fd0dcEBC0659e9004E4ea51f4cC

New account successfully created!

```

When obtaining a private key from a file, the script will ignore any whitespace.  The `0x` header is optional.

In addition to a password, an account can optionally be secured with an arbitrary keyfile that acts as a second authentication factor.  The password and keyfile are combined to form a composite passcode which is then sent to a key derivation function.  An account secured with a keyfile will be inaccessible if the keyfile is lost.  To specify a keyfile, use the `--keyfile` option:

```
> node .\create_acct.js ..\keystore\new.acct --getkey ..\keystore\privatekey.txt --keyfile ..\keyfiles\secret.key

Warning! Existing file will be overwritten: ..\keystore\new.acct
Continue? (y/N) y

Enter password:
Confirm password:

New account parameters:
Account file:        ..\keystore\new.acct
Password:            *****
Keyfile:             ..\keyfiles\secret.key
Private key from:    ..\keystore\privatekey.txt

Address:
0x71eF4E39Afc13fd0dcEBC0659e9004E4ea51f4cC

New account successfully created!

```

The password can alternatively be supplied from the command line:

```
> node .\create_acct.js ..\keystore\new.acct --getkey ..\keystore\privatekey.txt --pass 123456

Warning! Existing file will be overwritten: ..\keystore\new.acct
Continue? (y/N) y

New account parameters:
Account file:        ..\keystore\new.acct
Password:            *****
Private key from:    ..\keystore\privatekey.txt

Address:
0x71eF4E39Afc13fd0dcEBC0659e9004E4ea51f4cC

New account successfully created!

```

### sign a transaction

```
> node .\sign_tx.js --help

Usage: node.exe sign_tx.js <txFile> <accountFile> [options]

Options:
--help                - Displays this guide.
--pass <string>       - Specify the account password.
--keyfile <file>      - Specify the account keyfile.
--nopass              - Force empty password.
--chainid <int>       - Specify a blockchain ID for the transaction. Program default is 1 (Ethereum mainnet).
--verbosity <int>     - Specify a verbosity in the range [-1, 2].
--verbose             - Force maximum verbosity.
--iter <int>          - Specify the number of hash iterations for the keyfile.

```

To sign a transaction, first edit the transaction file `tx_params.js` containing the transaction parameters:

```
> cat .\tx_params.js
const txParams = {
  nonce: '0',
  to: '0xfBAf632D16bAd2da3C477e5Ec2044E2Cd104c27e', // 0x header optional.
  value: '1.0',
  valueUnits: 'milliether',
  gasPrice: '5.0',
  gasPriceUnits: 'gwei',
  gasLimit: '50000',
  data: 'hello', // empty string '' for null data
  dataEnc: 'utf-8'
}
module.exports = txParams;
```

Modify each field of the transaction file as desired.  The `to` address will be rejected if its <a href="https://github.com/ethereum/EIPs/blob/master/EIPS/eip-55.md">checksum</a> is invalid.  To circumvent the checksum, use all upper-case or all lower-case letters.  If invalid units are chosen, a list of acceptable units will be displayed.  If an invalid character encoding is chosen, a list of acceptable encodings will be displayed.

Once the transaction parameters are set, the transaction can be signed:

```
> node .\sign_tx.js .\tx_params.js ..\keystore\new.acct

Enter password:

Transaction information:
To:                0xfBAf632D16bAd2da3C477e5Ec2044E2Cd104c27e
From:              0x71eF4E39Afc13fd0dcEBC0659e9004E4ea51f4cC
Nonce:             0
Chain ID:          1
Value:             1e+15 wei
Gas Price:         5e+9 wei
Gas Limit:         50000
Data:              hello

Signature information:
Message Hash:      0xae9fd562f455836fd89a69821534a3314f0fa9447669e418d80171feae8e1619
v:                 38
r:                 0x0c0d4cc5896cfad7450cfa4e69bc2c6b2a1c4b02ea3ba558fe1b4d84cd33aa7c
s:                 0x0ecf784d85260b41207629739d6e08e9127a48fd50300355ecf731dbc4882680

Signed transaction:
0xf8708085012a05f20082c35094fbaf632d16bad2da3c477e5ec2044e2cd104c27e87038d7ea4c680008568656c6c6f26a00c0d4cc5896cfad7450cfa4e69bc2c6b2a1c4b02ea3ba558fe1b4d84cd33aa7ca00ecf784d85260b41207629739d6e08e9127a48fd50300355ecf731dbc4882680

```

The signed transaction can be broadcast from a geth node or a third-party utility such as <a href="https://etherscan.io/pushTx">etherscan.io/pushTx</a>.

### change an account passcode

```
> node .\change_passcode.js --help

Usage: node.exe change_passcode.js <accountFile> [options]

Options:
--help              - Displays this guide.
--passnew <string>  - Specify new account password.
--passold <string>  - Specify current account password.
--keyfilenew <file> - Specify new keyfile.
--keyfileold <file> - Specify current keyfile.
--nopassnew         - Force empty password for new account.
--nopassold         - Force empty password for current account.
--filenew <file>    - Save the account to a new file after updating the passcode. The original file will not be deleted.
--verbose           - Enable verbose mode. Warning: verbose mode will display sensitive information.
--iterold <int>     - Specify the number of hash iterations for the old keyfile.
--iternew <int>     - Specify the number of hash iterations for the new keyfile.

```

```
> node .\change_passcode.js ..\keystore\new.acct

Enter current password:

Specify new password:
Confirm new password:

Altered passcode parameters:
Account file:             ..\keystore\new.acct
Previous password:        *****
New password:             *****

Passcode successfully updated!

```

### display an account address

```
> node .\get_address.js --help

Usage: node.exe get_address.js <accountFile> [options]

Options:
--help   - Displays this guide.

```

```
> node .\get_address.js ..\keystore\new.acct

Address for account ..\keystore\new.acct:
0x71eF4E39Afc13fd0dcEBC0659e9004E4ea51f4cC

```

### get the private key of an account

```
> node .\get_priv.js --help

Usage: node.exe get_priv.js <accountFile> [options]

Options:
--help              - Displays this guide.
--pass <string>     - Specify the account password.
--keyfile <file>    - Specify the account keyfile.
--nopass            - Force empty password.
--iter <int>        - Determines the number of times the keyfile is hashed.

```

```
> node .\get_priv.js ..\keystore\new.acct

Enter password:

Private key for account ..\keystore\new.acct:
0x0000000500000005000000050000000500000005000000050000000500000005

```

### get the hash of a file

```
> node .\hash_file.js --help

Usage: node.exe hash_file.js <file> [options]

Options:
--help              - Displays this guide.
--list              - Displays available hashes.
--hash <hash>       - Determines the hash algorithm.
--iter <int>        - Determines the number of times the hash is applied.

```

```
> node .\hash_file.js ..\keyfiles\secret.key

Available hashes:

0   DSA
1   DSA-SHA
2   DSA-SHA1
3   DSA-SHA1-old
4   RSA-MD4
5   RSA-MD5
6   RSA-MDC2
7   RSA-RIPEMD160
8   RSA-SHA
9   RSA-SHA1
10  RSA-SHA1-2
11  RSA-SHA224
12  RSA-SHA256
13  RSA-SHA384
14  RSA-SHA512
15  dsaEncryption
16  dsaWithSHA
17  dsaWithSHA1
18  dss1
19  ecdsa-with-SHA1
20  md4
21  md4WithRSAEncryption
22  md5
23  md5WithRSAEncryption
24  mdc2
25  mdc2WithRSA
26  ripemd
27  ripemd160
28  ripemd160WithRSA
29  rmd160
30  sha
31  sha1
32  sha1WithRSAEncryption
33  sha224
34  sha224WithRSAEncryption
35  sha256
36  sha256WithRSAEncryption
37  sha384
38  sha384WithRSAEncryption
39  sha512
40  sha512WithRSAEncryption
41  shaWithRSAEncryption
42  ssl2-md5
43  ssl3-md5
44  ssl3-sha1
45  whirlpool

Index number of the desired algorithm: 39

sha512 hash of file ..\keyfiles\secret.key:
0xbba1994e3e215cb698cbd3090f199fea85d33fd02c2e6d3cabcf9fcd258c9636b748d3f7ee6a3f56dfdfdff18c88e4b5b7f09424fdf2e1e602e9ae7a8e524ac1

```

The hash algorithm can alternatively be supplied in the command line:

```
> node .\hash_file.js ..\keyfiles\secret.key --hash sha512

sha512 hash of file ..\keyfiles\secret.key:
0xbba1994e3e215cb698cbd3090f199fea85d33fd02c2e6d3cabcf9fcd258c9636b748d3f7ee6a3f56dfdfdff18c88e4b5b7f09424fdf2e1e602e9ae7a8e524ac1

```

## license

MIT License

Copyright (c) 2018 Kenneth Sedgwick

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.