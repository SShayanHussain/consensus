import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  real,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Users — authentication identity (NOT tenant-scoped)
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  verifyToken: text("verify_token"),
  resetToken: text("reset_token"),
  resetExpires: timestamp("reset_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Workspaces — the tenant boundary (workspace_id = tenant_id everywhere)
// ---------------------------------------------------------------------------
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  plan: text("plan").default("free").notNull(), // 'free' | 'pro' | 'team'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Workspace Members — many-to-many (supports workspace switcher)
// Roles: 'owner' | 'reviewer' | 'member'
// Reviewer: can approve/reject runs, but cannot change tool policy.
// ---------------------------------------------------------------------------
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").default("member").notNull(), // 'owner' | 'reviewer' | 'member'
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
  ]
);

// ---------------------------------------------------------------------------
// Runs — agent task executions
// ---------------------------------------------------------------------------
export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  goal: text("goal").notNull(),
  status: text("status").default("queued").notNull(),
  // 'queued' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'aborted'
  result: jsonb("result"), // Final artifact / output
  stepCount: integer("step_count").default(0).notNull(),
  toolCallCount: integer("tool_call_count").default(0).notNull(),
  costUsd: real("cost_usd").default(0).notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Approvals — HITL gate records
// ---------------------------------------------------------------------------
export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" })
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  proposedAction: jsonb("proposed_action").notNull(), // What the agent wants to do
  context: jsonb("context"), // Full context for the reviewer
  status: text("status").default("pending").notNull(),
  // 'pending' | 'approved' | 'rejected' | 'edited'
  reviewerId: uuid("reviewer_id")
    .references(() => users.id, { onDelete: "set null" }),
  reviewerNote: text("reviewer_note"),
  editedAction: jsonb("edited_action"), // If edited, what the reviewer changed
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Tool Configs — MCP tool registry + classification
// ---------------------------------------------------------------------------
export const toolConfigs = pgTable("tool_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  mcpServer: text("mcp_server").notNull(), // Which MCP server provides this
  classification: text("classification").default("read_only").notNull(),
  // 'read_only' | 'consequential'
  enabled: boolean("enabled").default(true).notNull(),
  requiresApproval: boolean("requires_approval").default(false).notNull(),
  // Consequential tools ALWAYS require approval (enforced in graph, this is UI config)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Audit Log — append-only, vendor-independent (DECISIONS.md: separate from tracing)
// ---------------------------------------------------------------------------
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "set null" }),
  actor: text("actor").notNull(), // 'supervisor' | 'researcher' | 'analyst' | 'writer' | 'system' | user_id
  action: text("action").notNull(), // 'tool_call' | 'approval_request' | 'approval_decision' | 'run_start' | 'run_complete' | etc.
  detail: jsonb("detail"), // Action-specific payload
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const runsRelations = relations(runs, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [runs.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [runs.userId], references: [users.id] }),
  approvals: many(approvals),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  run: one(runs, { fields: [approvals.runId], references: [runs.id] }),
  workspace: one(workspaces, { fields: [approvals.workspaceId], references: [workspaces.id] }),
  reviewer: one(users, { fields: [approvals.reviewerId], references: [users.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  workspace: one(workspaces, { fields: [auditLog.workspaceId], references: [workspaces.id] }),
  run: one(runs, { fields: [auditLog.runId], references: [runs.id] }),
}));

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;
export type ToolConfig = typeof toolConfigs.$inferSelect;
export type NewToolConfig = typeof toolConfigs.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
