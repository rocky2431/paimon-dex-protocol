/**
 * Launchpad Type Definitions
 * Types for RWA project listing and participation
 */

/**
 * Project status enum matching ProjectRegistry.sol
 */
export enum ProjectStatus {
  Voting = 0,
  Active = 1,
  Rejected = 2,
  Completed = 3,
}

/**
 * RWA Asset Tier classification
 */
export enum AssetTier {
  T1 = 'T1', // US Treasuries (80% LTV)
  T2 = 'T2', // Investment-grade credit (65% LTV)
  T3 = 'T3', // RWA revenue pools (50% LTV)
}

/**
 * RWA Project data structure
 */
export interface RWAProject {
  id: number;
  issuer: string;
  rwaToken: string;
  targetRaise: bigint;
  totalRaised: bigint;
  votingEndTime: number;
  saleEndTime: number;
  complianceDocURI: string;
  auditReportURI: string;
  disclosureURI: string;
  status: ProjectStatus;
  approveVotes: bigint;
  rejectVotes: bigint;

  // Derived/computed fields
  progress: number; // totalRaised / targetRaise * 100
  timeRemaining: number; // saleEndTime - now (in seconds)
  assetTier?: AssetTier;
  apy?: number; // Expected APY from PRD
}

/**
 * Sale data from IssuanceController
 */
export interface SaleData {
  rwaToken: string;
  minimumRaise: bigint;
  maximumRaise: bigint;
  minContribution: bigint;
  maxContribution: bigint;
  totalRaised: bigint;
  saleEndTime: number;
  isWhitelisted: boolean;
  isFinalized: boolean;
}

/**
 * Filter options for project list
 */
export interface ProjectFilters {
  status?: ProjectStatus[];
  assetTier?: AssetTier[];
  searchQuery?: string;
}

/**
 * Sort options for project list
 */
export enum SortOption {
  RaiseAmount = 'raise_amount',
  EndDate = 'end_date',
  APY = 'apy',
  Newest = 'newest',
}

/**
 * View mode for project list
 */
export enum ViewMode {
  Grid = 'grid',
  List = 'list',
}

/**
 * Project list state
 */
export interface ProjectListState {
  projects: RWAProject[];
  isLoading: boolean;
  error: string | null;
  filters: ProjectFilters;
  sortBy: SortOption;
  viewMode: ViewMode;
}

/**
 * Compliance document metadata
 */
export interface ComplianceDocument {
  name: string;
  uri: string;
  type: 'offering_memo' | 'audit_report' | 'risk_disclosure';
  size?: string;
  lastModified?: Date;
}

/**
 * User participation data
 */
export interface UserParticipation {
  projectId: number;
  contribution: bigint;
  hasClaimed: boolean;
  isWhitelisted: boolean;
  claimableTokens: bigint;
}
