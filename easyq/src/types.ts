export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  lastVisited: string;
  totalVisits: number;
}

export interface QueueLogRecord {
  id: string;
  queueNumber: number;
  name: string;
  phone: string;
  createdAt: string;
}

export interface VendorData {
  id: string;
  name: string;
  pass: string;
  pin: string;
  currentQueue: number;
  totalQueue: number;
  history?: Record<string, number>;
  queueLogs?: Record<string, QueueLogRecord>;
  customers?: Record<string, CustomerRecord>;
}