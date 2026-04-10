export type AdminDashboardStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE"
  | "BLOCKED";

export type AdminDashboardRepeatFilter = "ALL" | "YES" | "NO";

export type AdminDashboardSortKey =
  | "name"
  | "status"
  | "balance"
  | "activeInvitedCount"
  | "rechargeCount"
  | "activeForDays";

export type AdminDashboardSortDirection = "asc" | "desc";

export type AdminDashboardQueryDto = {
  search: string;
  status: AdminDashboardStatusFilter;
  repeat: AdminDashboardRepeatFilter;
  sortBy: AdminDashboardSortKey;
  sortDirection: AdminDashboardSortDirection;
  page: number;
  pageSize: number;
  lowEarningsThreshold: number;
  selectedUserId?: string;
  includeTimeline: boolean;
};

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isDeleted: boolean;
  createdAt: string;
  activeUntil: string | null;
  activatedSince?: string | null;
  activeForDays?: number;
  balance: number;
  pendingReferralEarnings: number;
  totalPotentialBalance: number;
  totalCharged: number;
  rechargeCount: number;
  subscriptionPaymentMethod: string | null;
  latestPaymentAmount: number | null;
  latestPaymentCreatedAt: string | null;
  invitedCount: number;
  activeInvitedCount: number;
  repeatedSubscription: boolean;
  daysToExpiry?: number | null;
  expiringSoon?: boolean;
  monthlyProfitPotential?: boolean;
  renewalIncentiveCandidate?: boolean;
  lowEarningsCandidate?: boolean;
};

export type AdminDashboardOverview = {
  totalUsers: number;
  totalSubscribers: number;
  paidSubscribers: number;
  activeSubscribers: number;
  repeatedSubscribers: number;
  statusDistribution: {
    active: number;
    inactive: number;
    blocked: number;
  };
  totalPendingReferralEarnings: number;
  totalUserBalances: number;
  totalLiveUserLiabilities: number;
  operatingReserveAmount: number;
  previousOwnerWithdrawalsTotal: number;
  availableToWithdraw: number;
  monthlyProfitPotentialUsers: number;
  renewalIncentiveCandidates: number;
  lowEarningCandidates: number;
  lowEarningsThreshold: number;
  platformEarningsTotal: number;
  platformEarningsToday: number;
  platformEarningsMonth: number;
  programEarningsTotal: number;
  programEarningsToday: number;
  programEarningsMonth: number;
  receivedAmountTotal: number;
  receivedAmountToday: number;
  receivedAmountMonth: number;
  paidOutAmountTotal: number;
  paidOutAmountToday: number;
  paidOutAmountMonth: number;
  netProfitAmount: number;
  receivedViaPaypal: number;
  receivedViaShamCash: number;
  paidOutViaPaypal: number;
  paidOutViaShamCash: number;
  paidOutManualSettlements: number;
  paypalWalletEstimatedBalance: number;
  shamCashWalletEstimatedBalance: number;
};

export type AdminDashboardMonthlyTimelineItem = {
  monthKey: string;
  receivedAmount: number;
  paidOutAmount: number;
  platformEarnings: number;
  programEarnings: number;
  newSubscribers: number;
  netProfitAmount: number;
};

export type AdminDashboardSelectedUserDetails = {
  profile: DashboardUser;
  listingSummary: {
    properties: number;
    newCars: number;
    oldCars: number;
    otherItems: number;
    totalActive: number;
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    createdAt: string;
  }>;
  recentChargingLogs: Array<{
    id: string;
    type: string;
    amount: number;
    createdAt: string;
  }>;
  recentNotifications: Array<{
    id: string;
    title: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }>;
  monthlyStats: Array<{
    monthKey: string;
    rechargeAmount: number;
    rechargeCount: number;
    rewardAmount: number;
    withdrawalAmount: number;
    netAmount: number;
  }>;
};

export type AdminDashboardResponse = {
  overview: AdminDashboardOverview;
  filters: {
    search: string;
    status: AdminDashboardStatusFilter;
    repeat: AdminDashboardRepeatFilter;
    sortBy: AdminDashboardSortKey;
    sortDirection: AdminDashboardSortDirection;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  users: DashboardUser[];
  monthlyTimeline?: AdminDashboardMonthlyTimelineItem[];
  selectedUser?: AdminDashboardSelectedUserDetails | null;
};
