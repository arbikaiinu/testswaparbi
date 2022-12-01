import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  Observable,
  of,
  Subject,
  timer
} from 'rxjs';
import { AvailableTokenAmount } from '@shared/models/tokens/available-token-amount';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  tap
} from 'rxjs/operators';
import { SearchQueryService } from '@features/swaps/shared/components/tokens-select/services/search-query-service/search-query.service';
import { TokensService } from '@core/services/tokens/tokens.service';
import { TokensSelectorService } from '@features/swaps/shared/components/tokens-select/services/tokens-selector-service/tokens-selector.service';
import { BlockchainToken } from '@shared/models/tokens/blockchain-token';
import { compareAddresses, compareTokens } from '@shared/utils/utils';
import { Token } from '@shared/models/tokens/token';
import { Token as SdkToken } from 'rubic-sdk/lib/common/tokens/token';
import BigNumber from 'bignumber.js';
import { BlockchainName, BlockchainsInfo, EvmWeb3Pure } from 'rubic-sdk';
import { blockchainImageKey } from '@features/swaps/shared/components/tokens-select/services/tokens-list-service/constants/blockchain-image-key';
import { DEFAULT_TOKEN_IMAGE } from '@shared/constants/tokens/default-token-image';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TokensListType } from '@features/swaps/shared/components/tokens-select/models/tokens-list-type';
import { TokensList } from '@features/swaps/shared/components/tokens-select/services/tokens-list-service/models/tokens-list';

@Injectable()
export class TokensListService {
  /**
   * Emits events, when list must be updated.
   */
  private readonly updateTokens$ = new Subject<void>();

  private readonly _searchLoading$ = new BehaviorSubject<boolean>(false);

  public readonly searchLoading$ = this._searchLoading$.asObservable();

  private set searchLoading(value: boolean) {
    this._searchLoading$.next(value);
  }

  private readonly _tokensToShow$ = new BehaviorSubject<AvailableTokenAmount[]>([]);

  public readonly tokensToShow$ = this._tokensToShow$.asObservable();

  private set tokensToShow(value: AvailableTokenAmount[]) {
    this._tokensToShow$.next(value);
  }

  private readonly _customToken$ = new BehaviorSubject<AvailableTokenAmount>(undefined);

  public readonly customToken$ = this._customToken$.asObservable();

  public get customToken(): AvailableTokenAmount {
    return this._customToken$.value;
  }

  private set customToken(value: AvailableTokenAmount) {
    this._customToken$.next(value);
  }

  private get searchQuery(): string {
    return this.searchQueryService.query;
  }

  private get blockchain(): BlockchainName {
    return this.tokensSelectorService.blockchain;
  }

  private get listType(): TokensListType {
    return this.tokensSelectorService.listType;
  }

  constructor(
    private readonly searchQueryService: SearchQueryService,
    private readonly tokensService: TokensService,
    private readonly tokensSelectorService: TokensSelectorService,
    private readonly httpClient: HttpClient
  ) {
    this.subscribeOnUpdateTokens();

    this.subscribeOnTokensChange();
    this.subscribeOnSearchQueryChange();
    this.subscribeOnBlockchainChange();
  }

  private subscribeOnTokensChange(): void {
    combineLatest([this.tokensService.tokens$, this.tokensService.favoriteTokens$])
      .pipe(debounceTime(100))
      .subscribe(() => this.updateTokens$.next());
  }

  private subscribeOnSearchQueryChange(): void {
    this.searchQueryService.query$.pipe(distinctUntilChanged()).subscribe(() => {
      this.updateTokens$.next();
    });
  }

  private subscribeOnBlockchainChange(): void {
    this.tokensSelectorService.blockchain$.subscribe(blockchain => {
      if (!blockchain) {
        return;
      }
      this.updateTokens$.next();
    });
  }

  /**
   * Handles tokens list update.
   * Can be called only from constructor.
   */
  private subscribeOnUpdateTokens(): void {
    this.updateTokens$
      .pipe(
        debounceTime(50),
        switchMap(() => {
          if (this.searchQuery.length) {
            if (this.listType === 'default') {
              return this.getDefaultTokensByQuery();
            } else {
              return of({ tokensToShow: this.getFilteredFavoriteTokens() });
            }
          }
          return of({ tokensToShow: this.getSortedTokens() });
        })
      )
      .subscribe((tokensList: TokensList) => {
        if ('tokensToShow' in tokensList) {
          this.tokensToShow = tokensList.tokensToShow;
          this.customToken = null;
        } else {
          this.customToken = tokensList.customToken;
        }
        this.searchLoading = false;
      });
  }

  /**
   * Handles search query requests to APIs and gets parsed tokens.
   */
  private getDefaultTokensByQuery(): Observable<TokensList> {
    return timer(300).pipe(
      tap(() => (this.searchLoading = true)),
      switchMap(() => this.tryParseQueryAsBackendTokens()),
      switchMap(async backendTokens => {
        if (backendTokens?.length) {
          return { tokensToShow: backendTokens };
        }

        const customToken = await this.tryParseQueryAsCustomToken();
        if (customToken) {
          return { customToken };
        }

        return { tokensToShow: [] };
      })
    );
  }

  /**
   * Fetches tokens form backend by search query.
   */
  private tryParseQueryAsBackendTokens(): Observable<AvailableTokenAmount[]> {
    if (!this.searchQuery) {
      return of([]);
    }

    return this.tokensService.fetchQueryTokens(this.searchQuery, this.blockchain).pipe(
      map(backendTokens => {
        if (backendTokens.size) {
          return backendTokens
            .map(token => {
              return {
                ...token,
                available: this.isTokenAvailable(token),
                favorite: this.isTokenFavorite(token)
              };
            })
            .toArray();
        }
        return [];
      })
    );
  }

  /**
   * Tries to parse custom token by search query requesting Web3.
   */
  private async tryParseQueryAsCustomToken(): Promise<AvailableTokenAmount> {
    try {
      if (this.searchQuery) {
        const token = await SdkToken.createToken({
          blockchain: this.blockchain,
          address: this.searchQuery
        });

        if (token?.name && token?.symbol && token?.decimals) {
          const image = await this.fetchTokenImage(token);

          return {
            ...token,
            image,
            rank: 0,
            amount: new BigNumber(NaN),
            price: 0,
            available: this.isTokenAvailable(token),
            favorite: this.isTokenFavorite(token)
          };
        }
      }
    } catch {}
    return null;
  }

  /**
   * Fetches token's image url.
   * @param token Token to display.
   * @return Promise<string> Token image url.
   */
  private async fetchTokenImage(token: BlockchainToken): Promise<string> {
    const blockchainKey = blockchainImageKey[token.blockchain];
    if (!blockchainKey) {
      return DEFAULT_TOKEN_IMAGE;
    }

    const tokenAddress = BlockchainsInfo.isEvmBlockchainName(token.blockchain)
      ? EvmWeb3Pure.toChecksumAddress(token.address)
      : token.address;
    const image = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${blockchainKey}/assets/${tokenAddress}/logo.png`;

    return firstValueFrom(
      this.httpClient.get<string>(image).pipe(
        catchError((err: unknown) => {
          return (err as HttpErrorResponse)?.status === 200 ? of(image) : of(DEFAULT_TOKEN_IMAGE);
        })
      )
    );
  }

  /**
   * Gets filtered favorite tokens by blockchain and query.
   */
  private getFilteredFavoriteTokens(): AvailableTokenAmount[] {
    const allFavoriteTokens = this.tokensService.favoriteTokens.toArray();

    const query = this.searchQuery.toLowerCase();
    const filteredFavoriteTokens = allFavoriteTokens
      .filter(token => token.blockchain === this.blockchain)
      .map(token => ({
        ...token,
        available: this.isTokenAvailable(token),
        favorite: true
      }));

    if (query.startsWith('0x')) {
      return filteredFavoriteTokens.filter(token => token.address.toLowerCase().includes(query));
    } else {
      const symbolMatchingTokens = filteredFavoriteTokens.filter(token =>
        token.symbol.toLowerCase().includes(query)
      );
      const nameMatchingTokens = filteredFavoriteTokens.filter(token =>
        token.name.toLowerCase().includes(query)
      );

      return symbolMatchingTokens.concat(
        nameMatchingTokens.filter(nameToken =>
          symbolMatchingTokens.every(
            symbolToken => !compareAddresses(nameToken.address, symbolToken.address)
          )
        )
      );
    }
  }

  /**
   * Gets sorted list of default or favorite tokens.
   */
  private getSortedTokens(): AvailableTokenAmount[] {
    if (this.listType === 'default') {
      const tokens = this.tokensService.tokens.toArray();

      const currentBlockchainTokens = tokens
        .filter(token => token.blockchain === this.blockchain)
        .map(token => ({
          ...token,
          available: this.isTokenAvailable(token),
          favorite: this.isTokenFavorite(token)
        }));
      return this.sortTokensByComparator(currentBlockchainTokens);
    } else {
      const favoriteTokens = this.tokensService.favoriteTokens.toArray();

      const currentBlockchainFavoriteTokens = favoriteTokens
        .filter((token: AvailableTokenAmount) => token.blockchain === this.blockchain)
        .map(token => ({
          ...token,
          available: this.isTokenAvailable(token),
          favorite: true
        }));
      return this.sortTokensByComparator(currentBlockchainFavoriteTokens);
    }
  }

  /**
   * Sorts tokens by comparator.
   * @param tokens Tokens to perform with.
   * @return AvailableTokenAmount[] Filtered and sorted tokens.
   */
  private sortTokensByComparator(tokens: AvailableTokenAmount[]): AvailableTokenAmount[] {
    const comparator = (a: AvailableTokenAmount, b: AvailableTokenAmount) => {
      const aAmount = a.amount.isFinite() ? a.amount : new BigNumber(0);
      const bAmount = b.amount.isFinite() ? b.amount : new BigNumber(0);
      const amountsDelta = bAmount.minus(aAmount).toNumber();
      return Number(b.available) - Number(a.available) || amountsDelta || b.rank - a.rank;
    };
    return tokens.sort(comparator);
  }

  private isTokenFavorite(token: BlockchainToken): boolean {
    return this.tokensService.favoriteTokens.some(favoriteToken =>
      compareTokens(favoriteToken, token)
    );
  }

  private isTokenAvailable(token: BlockchainToken): boolean {
    const oppositeToken = this.oppositeToken();
    return !oppositeToken || !compareTokens(oppositeToken, token);
  }

  private oppositeToken(): Token {
    const oppositeTokenType =
      this.tokensSelectorService.formType === 'from' ? 'toToken' : 'fromToken';
    return this.tokensSelectorService.form.value[oppositeTokenType];
  }
}