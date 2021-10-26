import BigNumber from 'bignumber.js';
import { BatchCall } from 'src/app/core/services/blockchain/models/BatchCall';

export type GasCalculationMethod = (
  amountIn: string,
  amountOutMin: string,
  path: string[],
  deadline: number
) => { callData: BatchCall; defaultGasLimit: BigNumber };