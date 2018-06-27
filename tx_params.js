const txParams = {
  nonce: '0',
  to: '0xbfe00b11baa36715cfbefb00c218bc7c5ca51075', // 0x header optional.
  value: '1.0',
  valueUnits: 'milliether',
  gasPrice: '5.0',
  gasPriceUnits: 'gwei',
  gasLimit: '50000',
  data: 'hello', // empty string '' for null data
  dataEnc: 'utf-8'
}
module.exports = txParams;