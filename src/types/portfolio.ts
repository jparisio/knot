export type AccountType = 'TFSA' | 'NON_REG';
export type TradeType = 'BUY' | 'SELL';

export interface Holding {
  symbol: string;
  shares: number;
  avgCost: number; // per share, weighted average
}

export interface Trade {
  id: string;
  type: TradeType;
  symbol: string;
  shares: number;
  price: number;
  account: AccountType;
  timestamp: number;
}

export interface Account {
  type: AccountType;
  cashBalance: number;
  holdings: Holding[];
}

export interface TFSAConfig {
  totalRoom: number;         // CRA contribution room entered by user
  contributed: number;       // dollars invested into TFSA (tracked by this app)
  overflowEnabled: boolean;  // auto-route excess to Non-Registered when TFSA is full
}

export interface PortfolioState {
  tfsa: Account;
  nonReg: Account;
  tfsaConfig: TFSAConfig;
  trades: Trade[];
}
