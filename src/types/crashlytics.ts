export type CrashSeverity = 'fatal' | 'non_fatal' | 'anr' | 'warning';
export type CrashStatus = 'open' | 'investigating' | 'resolved' | 'ignored';

export interface CrashOccurrence {
  id: string;
  timestamp: string;
  appVersion: string;
  osVersion: string;
  deviceModel: string;
  userId?: string;
  breadcrumbs: string[];
}

export interface CrashIssue {
  id: string;
  title: string;
  subtitle: string;
  exceptionType: string;
  severity: CrashSeverity;
  status: CrashStatus;
  firstSeen: string;
  lastSeen: string;
  totalEvents: number;
  impactedUsersCount: number;
  stackTrace: string[];
  affectedVersions: string[];
  assignedTo?: string;
  rootCauseNotes?: string;
}

export interface CrashMetricsSummary {
  crashFreeUsersPct: number;
  crashFreeSessionsPct: number;
  totalCrashes24h: number;
  openIssuesCount: number;
  anrCount24h: number;
  topOffendingVersion: string;
}
