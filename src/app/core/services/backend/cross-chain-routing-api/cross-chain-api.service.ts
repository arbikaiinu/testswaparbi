import { Injectable } from '@angular/core';
import { HttpService } from 'src/app/core/services/http/http.service';

import { BlockchainName, CrossChainTradeType } from 'rubic-sdk';
import { TO_BACKEND_BLOCKCHAINS } from '@app/shared/constants/blockchain/backend-blockchains';
import { Observable } from 'rxjs';
import { TO_BACKEND_CROSS_CHAIN_PROVIDERS } from './constants/to-backend-cross-chain-providers';

// @TODO TEST 1
@Injectable({
  providedIn: 'root'
})
export class CrossChainApiService {
  constructor(private readonly httpService: HttpService) {}

  public saveNotWhitelistedProvider(
    blockchain: BlockchainName,
    tradeType: CrossChainTradeType,
    routerAddress: string,
    gatewayAddress?: string
  ): Observable<void> {
    return this.httpService.post(`info/new_provider`, {
      network: TO_BACKEND_BLOCKCHAINS[blockchain],
      title: TO_BACKEND_CROSS_CHAIN_PROVIDERS[tradeType],
      address: routerAddress + (gatewayAddress ? `_${gatewayAddress}` : '')
    });
  }
}
