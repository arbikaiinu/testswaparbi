import {
  BLOCKCHAIN_NAME,
  EthLikeBlockchainName
} from '@app/shared/models/blockchain/blockchain-name';

export const CELER_CONTRACT: Partial<Record<EthLikeBlockchainName, string>> = {
  [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: '0x8523F3DC779bF2df1151906E933b9225A439Db85',
  [BLOCKCHAIN_NAME.POLYGON]: '0x0F43F9B778100951Ba18812E8D23E8245df17699',
  [BLOCKCHAIN_NAME.AVALANCHE]: '0xd82bf61411Ce2F6bd46Fd1e3b0459979809D4787',
  [BLOCKCHAIN_NAME.FANTOM]: '0x6B362d1C67D7E4Ff1467dFA38dE642f9D125E8Ad',
  [BLOCKCHAIN_NAME.ETHEREUM]: '0x53dC7535028e2fcaCa0d847AD108b9240C0801b1'
  // [BLOCKCHAIN_NAME.ARBITRUM]: '0x53dC7535028e2fcaCa0d847AD108b9240C0801b1'
};
