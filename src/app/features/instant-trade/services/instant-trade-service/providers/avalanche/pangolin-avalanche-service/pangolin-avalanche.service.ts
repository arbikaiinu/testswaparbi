import { Injectable } from '@angular/core';
import { pangolinAvalancheConstants } from 'src/app/features/instant-trade/services/instant-trade-service/providers/avalanche/pangolin-avalanche-service/pangolin-avalanche-constants';
import { CommonUniswapV2Service } from 'src/app/features/instant-trade/services/instant-trade-service/providers/common/uniswap-v2/common-service/common-uniswap-v2.service';
import AVAX_CONTRACT_ABI from 'src/app/features/instant-trade/services/instant-trade-service/providers/avalanche/models/avax-contract-abi';
import { AVAX_SWAP_METHOD } from 'src/app/features/instant-trade/services/instant-trade-service/providers/avalanche/models/swap-method';
import { INSTANT_TRADES_PROVIDER } from '@shared/models/instant-trade/INSTANT_TRADES_PROVIDER';

@Injectable({
  providedIn: 'root'
})
export class PangolinAvalancheService extends CommonUniswapV2Service {
  public readonly providerType = INSTANT_TRADES_PROVIDER.PANGOLIN;

  constructor() {
    super(pangolinAvalancheConstants);
    this.swapsMethod = AVAX_SWAP_METHOD;
    this.contractAbi = AVAX_CONTRACT_ABI;
  }
}
