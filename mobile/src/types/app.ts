export type UserRole = 'employee' | 'manager' | 'owner';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  restaurantId?: string | null;
  image?: string | null;
}

export interface Restaurant {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  timezone?: string;
  ownerId: string;
}

export interface Employee {
  id: string;
  userId: string;
  restaurantId: string;
  position?: string | null;
  hourlyRate?: number | null;
  isActive: boolean;
  user: AppUser;
}

export type ShiftStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type AssignmentStatus = 'ASSIGNED' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED';
export type AnomalyType = 'LATE_ARRIVAL' | 'MISSED_SHIFT' | 'EARLY_LEAVE';
export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface Shift {
  id: string;
  restaurantId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  notes?: string | null;
  maxEmployees?: number | null;
  createdAt: string;
  assignments?: ShiftAssignment[];
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  employeeId: string;
  status: AssignmentStatus;
  shift?: Shift;
  employee?: Employee;
  checkins?: Checkin[];
}

export interface Checkin {
  id: string;
  shiftAssignmentId: string;
  employeeId: string;
  checkinTime: string;
  checkoutTime?: string | null;
  notes?: string | null;
  shiftAssignment?: ShiftAssignment;
}

export interface Anomaly {
  id: string;
  employeeId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  detectedAt: string;
  resolvedAt?: string | null;
  isResolved: boolean;
  notes?: string | null;
  employee?: Employee;
  shiftAssignment?: ShiftAssignment;
}

export interface AnalyticsOverview {
  totalShiftsThisWeek: number;
  totalHoursWorked: number;
  attendanceRate: number;
  activeEmployeesCount: number;
  anomalyCount: number;
}

// ─── Billing / Subscriptions ─────────────────────────────────────────────────

export type PlanTier = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';

export interface PlanFeatures {
  maxEmployees: number;
  maxShiftsPerMonth: number;
  aiInsights: boolean;
  advancedAnalytics: boolean;
  aiShiftGeneration: boolean;
  multipleManagers: boolean;
  anomalyAlerts: boolean;
  exportReports: boolean;
}

export interface SubscriptionInfo {
  plan: PlanTier;
  planName: string;
  planPrice: string;
  features: PlanFeatures;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  stripeEnabled: boolean;
}

export interface PlanOption {
  tier: PlanTier;
  name: string;
  price: string;
  features: PlanFeatures;
  isCurrent: boolean;
  priceId: string | null;
}

export interface CheckoutSession {
  url: string;
  sessionId: string;
}

export interface PortalSession {
  url: string;
}

// ─── Paginated ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Invitation {
  id: string;
  code: string;
  restaurantId: string;
  role: UserRole;
  status: InvitationStatus;
  email?: string | null;
  expiresAt: string;
  createdAt: string;
  restaurant?: { id: string; name: string };
}
