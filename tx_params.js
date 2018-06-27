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