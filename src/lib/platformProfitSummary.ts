export type PlatformProfitSummaryInput = {
  subscriptionRevenueTotal: number;
  readyUserProfitsTotal: number;
  pendingUserProfitsTotal: number;
  previousOwnerWithdrawalsTotal?: number;
  operatingReserveRate?: number;
};

export const PLATFORM_OPERATING_RESERVE_RATE = 0.1;

export type PlatformProfitSummary = {
  subscriptionRevenueTotal: number;
  readyUserProfitsTotal: number;
  pendingUserProfitsTotal: number;
  totalLiveUserLiabilities: number;
  operatingReserve: number;
  netProfit: number;
  previousOwnerWithdrawalsTotal: number;
  availableToWithdraw: number;
};

const toMoney = (value: number) => Number(value.toFixed(2));

export const calculatePlatformProfitSummary = (
  input: PlatformProfitSummaryInput,
): PlatformProfitSummary => {
  const subscriptionRevenueTotal = Number(input.subscriptionRevenueTotal || 0);
  const readyUserProfitsTotal = Number(input.readyUserProfitsTotal || 0);
  const pendingUserProfitsTotal = Number(input.pendingUserProfitsTotal || 0);
  const previousOwnerWithdrawalsTotal = Number(
    input.previousOwnerWithdrawalsTotal || 0,
  );
  const operatingReserveRate = Number(
    input.operatingReserveRate ?? PLATFORM_OPERATING_RESERVE_RATE,
  );

  const totalLiveUserLiabilities =
    readyUserProfitsTotal + pendingUserProfitsTotal;
  const operatingReserve = subscriptionRevenueTotal * operatingReserveRate;
  const netProfit =
    subscriptionRevenueTotal - totalLiveUserLiabilities - operatingReserve;
  const availableToWithdraw = Math.max(
    0,
    netProfit - previousOwnerWithdrawalsTotal,
  );

  return {
    subscriptionRevenueTotal: toMoney(subscriptionRevenueTotal),
    readyUserProfitsTotal: toMoney(readyUserProfitsTotal),
    pendingUserProfitsTotal: toMoney(pendingUserProfitsTotal),
    totalLiveUserLiabilities: toMoney(totalLiveUserLiabilities),
    operatingReserve: toMoney(operatingReserve),
    netProfit: toMoney(netProfit),
    previousOwnerWithdrawalsTotal: toMoney(previousOwnerWithdrawalsTotal),
    availableToWithdraw: toMoney(availableToWithdraw),
  };
};
