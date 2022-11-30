import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GasService } from 'src/app/core/services/gas-service/gas.service';
import { BLOCKCHAIN_NAME } from 'rubic-sdk';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-gas-indicator',
  templateUrl: './gas-indicator.component.html',
  styleUrls: ['./gas-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GasIndicatorComponent {
  /**
   * Current gas price.
   */
  public readonly gasPrice$ = this.gasService
    .getGasPrice$(BLOCKCHAIN_NAME.ETHEREUM)
    .pipe(map(gasPrice => Number(gasPrice).toFixed(2).toString()));

  constructor(private readonly gasService: GasService) {}
}
