export interface SplitItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  quantity?: number;
  unit_price?: number;
  notes?: string;
  destination_name?: string;
  tags?: string[];
}

export interface ParsedReceipt {
  store_name: string;
  date: string;
  time?: string;
  currency: string;
  total_amount: number;
  tax_amount?: number;
  payment_method?: string;
  splits: SplitItem[];
  splits_sum: number;
  is_balanced: boolean;
  raw_text?: string;
}

export interface FireflyConfig {
  url: string;
  token: string;
  source_account: string;
  currency_code?: string;
  destination_account?: string;
  apply_rules: boolean;
  fire_webhooks: boolean;
}

export interface FireflyAccount {
  id: string;
  name: string;
  type: string;
  currency_code: string;
  currency_symbol?: string;
  current_balance?: string;
}

export interface FireflyCurrency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  primary: boolean;
  enabled: boolean;
}

export interface FireflyTransactionSplitPayload {
  type: 'withdrawal' | 'deposit' | 'transfer';
  date: string;
  amount: string;
  description: string;
  source_name?: string;
  source_id?: string;
  destination_name?: string;
  destination_id?: string;
  category_name?: string;
  currency_code?: string;
  notes?: string;
  tags?: string[];
}

export interface FireflyTransactionPayload {
  error_if_duplicate_hash: boolean;
  apply_rules: boolean;
  fire_webhooks: boolean;
  transactions: FireflyTransactionSplitPayload[];
}

export interface ProjectFile {
  name: string;
  filename: string;
  language: string;
  description: string;
  content: string;
}

export interface SampleReceipt {
  id: string;
  title: string;
  store: string;
  date: string;
  total: number;
  category_highlight: string;
  description: string;
  image_url: string;
  sample_data: ParsedReceipt;
}
