export type Role =
  | "super_admin"
  | "attorney"
  | "paralegal"
  | "intake_manager"
  | "receptionist"
  | "client";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  attorney: "Attorney",
  paralegal: "Paralegal",
  intake_manager: "Intake Manager",
  receptionist: "Receptionist",
  client: "Client",
};

export const PRACTICE_AREAS = [
  "Personal Injury",
  "Family Law",
  "Criminal Defense",
  "Immigration",
  "Business Law",
  "Estate Planning",
] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];

export const LEAD_SOURCES = [
  "Website Form",
  "Google Ads",
  "Referral",
  "Avvo",
  "Walk-in",
  "Social Media",
  "Bar Association",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Consultation Scheduled",
  "Consultation Completed",
  "Retainer Sent",
  "Retainer Signed",
  "Converted",
  "Lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const MATTER_STATUSES = [
  "New",
  "Open",
  "Discovery",
  "Negotiation",
  "Court Pending",
  "Settlement",
  "Closed",
] as const;
export type MatterStatus = (typeof MATTER_STATUSES)[number];

export const TASK_STATUSES = ["To Do", "In Progress", "Completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const EVENT_TYPES = [
  "Consultation",
  "Court Hearing",
  "Deposition",
  "Filing Deadline",
  "Client Meeting",
  "Internal Meeting",
  "Follow-up",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const CONTACT_TYPES = [
  "Lead",
  "Client",
  "Attorney",
  "Witness",
  "Referral Partner",
  "Company",
  "Opposing Counsel",
] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const COMM_TYPES = ["Email", "SMS", "Phone Call", "Internal Note"] as const;
export type CommType = (typeof COMM_TYPES)[number];

export const RETAINER_STATUSES = [
  "Draft",
  "Sent",
  "Viewed",
  "Pending Signature",
  "Signed",
] as const;
export type RetainerStatus = (typeof RETAINER_STATUSES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  color: string;
  hourlyRate: number;
  clientId?: string;
  twoFactorEnabled: boolean;
  lastActive: string;
}

export interface Note {
  id: string;
  body: string;
  at: string;
  authorId: string;
  leadId?: string;
  matterId?: string;
  clientId?: string;
}

export interface Activity {
  id: string;
  at: string;
  actor: string;
  text: string;
  leadId?: string;
  matterId?: string;
  clientId?: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  practiceArea: PracticeArea;
  caseType: string;
  description: string;
  source: LeadSource;
  assignedAttorneyId: string;
  intakeManagerId?: string;
  status: LeadStatus;
  priority: Priority;
  estimatedValue: number;
  createdAt: string;
  lastContactAt: string;
  nextFollowUpAt?: string;
  lostReason?: string;
}

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  notes?: string;
  matterId?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  leadId?: string;
  practiceArea: PracticeArea;
  attorneyId: string;
  since: string;
  status: "Active" | "Former";
  address?: string;
}

export interface Matter {
  id: string;
  name: string;
  number: string;
  clientId: string;
  practiceArea: PracticeArea;
  attorneyId: string;
  paralegalId?: string;
  status: MatterStatus;
  priority: Priority;
  openDate: string;
  closeDate?: string;
  court?: string;
  opposingParty?: string;
  nextDeadline?: string;
  caseValue: number;
  description: string;
}

export interface TaskItem {
  id: string;
  title: string;
  assigneeId: string;
  matterId?: string;
  leadId?: string;
  clientId?: string;
  priority: Priority;
  dueDate: string;
  status: TaskStatus;
  notes?: string;
  reminderAt?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  title: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  matterId?: string;
  leadId?: string;
  clientId?: string;
  attendeeIds: string[];
  location?: string;
  notes?: string;
}

export interface DocVersion {
  v: number;
  at: string;
  byId: string;
  note?: string;
}

export interface DocFile {
  id: string;
  name: string;
  folder: string;
  matterId?: string;
  leadId?: string;
  clientId?: string;
  uploadedById: string;
  uploadedAt: string;
  sizeKb: number;
  ext: string;
  versions: DocVersion[];
}

export interface Communication {
  id: string;
  type: CommType;
  direction: "Inbound" | "Outbound" | "Internal";
  fromName: string;
  toName: string;
  subject?: string;
  body: string;
  at: string;
  leadId?: string;
  clientId?: string;
  matterId?: string;
  userId?: string;
}

export interface Retainer {
  id: string;
  leadId: string;
  title: string;
  amount: number;
  feeStructure: string;
  status: RetainerStatus;
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  signedAt?: string;
}

export interface TimeEntry {
  id: string;
  matterId: string;
  userId: string;
  date: string;
  hours: number;
  rate: number;
  description: string;
  billable: boolean;
  invoiced: boolean;
}

export interface Expense {
  id: string;
  matterId: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  billable: boolean;
}

export interface Payment {
  id: string;
  invoiceId: string;
  date: string;
  amount: number;
  method: "Card" | "ACH" | "Check" | "Wire";
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  matterId?: string;
  issueDate: string;
  dueDate: string;
  items: { desc: string; amount: number }[];
  status: "Draft" | "Sent" | "Partial" | "Paid" | "Overdue";
  payments: Payment[];
}

export interface NotificationItem {
  id: string;
  at: string;
  text: string;
  kind: string;
  read: boolean;
  userId?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  active: boolean;
  runs: number;
}

export interface IntakeField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "yesno" | "number" | "phone" | "email";
  options?: string[];
  required: boolean;
  conditionalOn?: { fieldId: string; equals: string };
}

export interface IntakeForm {
  id: string;
  name: string;
  practiceArea: PracticeArea;
  active: boolean;
  fields: IntakeField[];
  submissions: number;
}

export interface IntakeSubmission {
  id: string;
  formId: string;
  submittedAt: string;
  data: Record<string, string>;
  status: "New" | "Processed";
  leadId?: string;
}

export interface ConflictMatch {
  kind: "Lead" | "Client" | "Matter" | "Contact" | "Opposing Party";
  id: string;
  name: string;
  context: string;
}

export interface ConflictCheck {
  id: string;
  at: string;
  byId: string;
  query: string;
  matches: ConflictMatch[];
}

export interface AuditLog {
  id: string;
  at: string;
  userId: string;
  action: string;
  entity: string;
  detail: string;
}

export interface DB {
  users: User[];
  leads: Lead[];
  contacts: Contact[];
  clients: Client[];
  matters: Matter[];
  tasks: TaskItem[];
  appointments: Appointment[];
  documents: DocFile[];
  communications: Communication[];
  notes: Note[];
  activities: Activity[];
  retainers: Retainer[];
  timeEntries: TimeEntry[];
  expenses: Expense[];
  invoices: Invoice[];
  notifications: NotificationItem[];
  automations: AutomationRule[];
  intakeForms: IntakeForm[];
  intakeSubmissions: IntakeSubmission[];
  conflictChecks: ConflictCheck[];
  auditLogs: AuditLog[];
  seq: Record<string, number>;
}
