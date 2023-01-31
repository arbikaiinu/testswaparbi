import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, Self } from '@angular/core';
import { FormControl } from '@angular/forms';
import { OrderRateService } from '@features/swaps/features/limit-order/services/order-rate.service';
import {
  RateLevel,
  RateLevelData,
  rateLevelsData
} from '@features/swaps/shared/constants/limit-orders/rate-levels';
import { map, takeUntil } from 'rxjs/operators';
import { TuiDestroyService } from '@taiga-ui/cdk';
import { SwapFormService } from '@core/services/swaps/swap-form.service';
import { PercentInfo } from '@features/swaps/features/limit-order/models/percent-info';
import BigNumber from 'bignumber.js';

@Component({
  selector: 'app-order-rate',
  templateUrl: './order-rate.component.html',
  styleUrls: ['./order-rate.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TuiDestroyService]
})
export class OrderRateComponent implements OnInit {
  public rate = new FormControl<string>({ value: '', disabled: true });

  public percentInfo: PercentInfo;

  public isUnknown: boolean;

  public rateDirection: 'from-to' | 'to-from' = 'from-to';

  public fromTokenName$ = this.swapFormService.fromToken$.pipe(map(token => token?.symbol || ''));

  public toTokenName$ = this.swapFormService.toToken$.pipe(map(token => token?.symbol || ''));

  private get formattedRate(): string {
    return this.rate.value.split(',').join('');
  }

  public get formattedPercentDiff(): string {
    const percent = Math.abs(this.percentInfo.percent).toString();
    if (this.percentInfo.percent >= 100) {
      return percent.slice(0, 3);
    }
    return percent;
  }

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly orderRateService: OrderRateService,
    private readonly swapFormService: SwapFormService,
    @Self() private readonly destroy$: TuiDestroyService
  ) {}

  ngOnInit() {
    this.orderRateService.rate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ value, percentDiff }) => {
        if (!value?.isFinite()) {
          this.rate.setValue('');
        } else if (!value.eq(this.formattedRate)) {
          this.updateRateFormValue();
        }

        this.isUnknown = !value?.isFinite();
        this.updateRateLevelData(percentDiff);

        this.cdr.markForCheck();
      });
  }

  private updateRateLevelData(percentDiff: number): void {
    let levelData: RateLevelData;
    if (this.isUnknown) {
      levelData = rateLevelsData[RateLevel.YELLOW];
    } else {
      let level: RateLevel;
      if (percentDiff <= -10) {
        level = RateLevel.RED;
      } else if (percentDiff <= -5) {
        level = RateLevel.YELLOW;
      } else if (percentDiff <= 0) {
        level = RateLevel.NOTHING;
      } else {
        level = RateLevel.GREEN;
      }
      levelData = rateLevelsData[level];
    }

    this.percentInfo = {
      percent: percentDiff,
      iconSrc: levelData.imgSrc,
      className: levelData.class
    };
  }

  public toggleChangeDirection(): void {
    this.rateDirection = this.rateDirection === 'from-to' ? 'to-from' : 'from-to';
    if (this.rate.value) {
      this.updateRateFormValue();
    }
  }

  public updateRateFormValue(): void {
    const marketRate = this.orderRateService.marketRate;
    if (this.rateDirection === 'from-to') {
      this.rate.setValue(marketRate.toFixed());
    } else {
      this.rate.setValue(new BigNumber(1).div(marketRate).dp(6).toFixed());
    }
  }
}
