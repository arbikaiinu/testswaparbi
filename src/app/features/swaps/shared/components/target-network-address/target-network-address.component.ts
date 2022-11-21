import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { debounceTime, distinctUntilChanged, filter, startWith } from 'rxjs/operators';
import { TuiDestroyService } from '@taiga-ui/cdk';
import { SwapFormService } from '@features/swaps/core/services/swap-form-service/swap-form.service';
import { TargetNetworkAddressService } from '@features/swaps/shared/components/target-network-address/services/target-network-address.service';
import { WINDOW } from '@ng-web-apis/common';
import { correctAddressValidator } from './services/utils/correct-address-validator';
import { FormControl } from '@angular/forms';
import { compareObjects, isNil } from '@app/shared/utils/utils';
import { NotificationsService } from '@app/core/services/notifications/notifications.service';
import { TuiNotification } from '@taiga-ui/core';

@Component({
  selector: 'app-target-network-address',
  templateUrl: './target-network-address.component.html',
  styleUrls: ['./target-network-address.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TuiDestroyService]
})
export class TargetNetworkAddressComponent implements OnInit {
  public readonly address = new FormControl<string>(undefined, [
    correctAddressValidator(
      this.swapFormService.inputValue.fromBlockchain,
      this.swapFormService.inputValue.toBlockchain
    )
  ]);

  public toBlockchain$ = this.swapFormService.input.controls.toBlockchain.valueChanges.pipe(
    startWith(this.swapFormService.inputValue.toBlockchain)
  );

  constructor(
    private readonly targetNetworkAddressService: TargetNetworkAddressService,
    private readonly swapFormService: SwapFormService,
    private readonly notificationsService: NotificationsService,
    @Inject(WINDOW) private readonly window: Window
  ) {}

  public ngOnInit(): void {
    this.subscribeOnTargetAddress();
    this.subsctibeOnFormValues();
  }

  private subsctibeOnFormValues(): void {
    this.swapFormService.inputValueChanges
      .pipe(
        filter(form => !isNil(form.fromToken) && !isNil(form.toToken)),
        distinctUntilChanged((prev, curr) => {
          return (
            compareObjects(prev.fromToken, curr.fromToken) &&
            compareObjects(prev.toToken, curr.toToken)
          );
        })
      )
      .subscribe(() => {
        this.address.patchValue(null);
      });
  }

  private subscribeOnTargetAddress(): void {
    this.address.valueChanges.pipe(debounceTime(10), distinctUntilChanged()).subscribe(address => {
      this.targetNetworkAddressService.setIsAddressValid(this.address.valid);
      this.targetNetworkAddressService.setAddress(this.address.valid ? address : null);
    });
  }

  public async setValueFromClipboard(): Promise<void> {
    try {
      const clipboardContent = await this.window.navigator.clipboard.readText();
      this.address.patchValue(clipboardContent);
    } catch (err) {
      this.notificationsService.show('Failed to read from clipboard.', {
        autoClose: 5000,
        status: TuiNotification.Error
      });
    }
  }
}