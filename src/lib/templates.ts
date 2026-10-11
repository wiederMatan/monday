import type { BoardSpec } from "./builder";
import { PALETTE } from "./colors";
import type { ID } from "./types";

export type TemplateIcon = "blank" | "project" | "bug" | "crm" | "content" | "team" | "event";

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: TemplateIcon;
  /** `userIds[0]` is the current user; the rest are teammates used for sample assignments. */
  build: (userIds: ID[]) => BoardSpec;
}

function pick(userIds: ID[], index: number): ID {
  return userIds[index] ?? userIds[0];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "blank",
    name: "Blank board",
    description: "Start from scratch with owners, status and due dates.",
    color: PALETTE.americanGray,
    icon: "blank",
    build: (u) => ({
      name: "New board",
      columns: [
        { key: "owner", type: "people", title: "Owner" },
        { key: "status", type: "status" },
        { key: "due", type: "date", title: "Due date" },
      ],
      groups: [
        {
          title: "To-Do",
          color: PALETTE.brightBlue,
          items: [
            { name: "Item 1", values: { owner: [pick(u, 0)], status: "Working on it", due: 2 } },
            { name: "Item 2", values: { status: "Done", due: -1 } },
            { name: "Item 3", values: {} },
          ],
        },
        { title: "Completed", color: PALETTE.doneGreen, items: [] },
      ],
    }),
  },
  {
    id: "project",
    name: "Project management",
    description: "Plan, track and deliver projects with timelines and budgets.",
    color: PALETTE.brightBlue,
    icon: "project",
    build: (u) => ({
      name: "Project plan",
      description: "Plan the scope, keep owners accountable and ship on time.",
      itemNoun: "task",
      columns: [
        { key: "owner", type: "people", title: "Owner" },
        { key: "status", type: "status" },
        { key: "priority", type: "status", preset: "priority" },
        { key: "timeline", type: "timeline" },
        { key: "due", type: "date", title: "Due date" },
        { key: "budget", type: "numbers", title: "Budget", unit: "$" },
        { key: "notes", type: "text", title: "Notes" },
      ],
      groups: [
        {
          title: "Planning",
          items: [
            { name: "Define project scope", values: { owner: [pick(u, 0)], status: "Working on it", priority: "High", timeline: [-2, 3], due: 3, budget: 1200 } },
            { name: "Stakeholder interviews", values: { owner: [pick(u, 1)], priority: "Medium", timeline: [2, 6], due: 6, budget: 800 } },
            { name: "Kickoff meeting", values: { owner: [pick(u, 0)], status: "Done", priority: "Low", timeline: [-5, -5], due: -5 } },
          ],
        },
        {
          title: "Execution",
          items: [
            { name: "Design mockups", values: { owner: [pick(u, 2)], status: "Working on it", priority: "High", timeline: [0, 7], due: 7, budget: 3500 } },
            { name: "Set up analytics", values: { owner: [pick(u, 1)], status: "Stuck", priority: "Medium", timeline: [-1, 4], due: 4, budget: 600, notes: "Waiting on tracking plan" } },
          ],
        },
        {
          title: "Completed",
          color: PALETTE.doneGreen,
          items: [
            { name: "Competitor research", values: { owner: [pick(u, 0)], status: "Done", priority: "Low", timeline: [-10, -6], due: -6, budget: 400 } },
          ],
        },
      ],
      views: ["kanban", "timeline", "chart"],
      automations: (r) => [
        { trigger: { type: "status_changes", columnId: r.column("status"), labelId: r.label("status", "Done") }, action: { type: "move_to_group", groupId: r.group("Completed") } },
      ],
    }),
  },
  {
    id: "bugs",
    name: "Bug tracking",
    description: "Log bugs, prioritize by severity and close the loop.",
    color: PALETTE.stuckRed,
    icon: "bug",
    build: (u) => ({
      name: "Bug tracking",
      itemNoun: "bug",
      columns: [
        {
          key: "status",
          type: "status",
          labels: [
            ["New", PALETTE.brightBlue],
            ["In progress", PALETTE.workingOrange],
            ["Fixed", PALETTE.doneGreen],
            ["Won't fix", PALETTE.americanGray],
            ["Needs info", PALETTE.sunset],
          ],
          done: "Fixed",
        },
        { key: "severity", type: "status", preset: "priority", title: "Severity" },
        { key: "dev", type: "people", title: "Developer" },
        { key: "reported", type: "date", title: "Reported" },
        {
          key: "platform",
          type: "tags",
          title: "Platform",
          tags: [
            ["Web", PALETTE.brightBlue],
            ["iOS", PALETTE.blackish],
            ["Android", PALETTE.brightGreen],
            ["API", PALETTE.purple],
          ],
        },
        { key: "verified", type: "checkbox", title: "Verified" },
      ],
      groups: [
        {
          title: "Open bugs",
          color: PALETTE.stuckRed,
          items: [
            { name: "Login button unresponsive on mobile", values: { status: "New", severity: "High", reported: 0, platform: ["iOS", "Android"] } },
            { name: "Search returns stale results", values: { status: "In progress", severity: "Medium", dev: [pick(u, 1)], reported: -2, platform: ["API"] } },
          ],
        },
        { title: "Fixed", color: PALETTE.doneGreen, items: [{ name: "Broken link in footer", values: { status: "Fixed", severity: "Low", dev: [pick(u, 0)], reported: -6, platform: ["Web"], verified: true } }] },
      ],
      views: ["kanban", "chart"],
      automations: (r) => [
        { trigger: { type: "item_created" }, action: { type: "set_status", columnId: r.column("status"), labelId: r.label("status", "New") } },
        { trigger: { type: "status_changes", columnId: r.column("status"), labelId: r.label("status", "Fixed") }, action: { type: "move_to_group", groupId: r.group("Fixed") } },
      ],
    }),
  },
  {
    id: "crm",
    name: "Sales pipeline",
    description: "Manage deals from first touch to closed-won.",
    color: PALETTE.doneGreen,
    icon: "crm",
    build: (u) => ({
      name: "Sales pipeline",
      itemNoun: "deal",
      columns: [
        { key: "owner", type: "people", title: "Owner" },
        {
          key: "stage",
          type: "status",
          title: "Stage",
          labels: [
            ["Lead", PALETTE.brightBlue],
            ["Qualified", PALETTE.purple],
            ["Proposal", PALETTE.workingOrange],
            ["Negotiation", PALETTE.darkOrange],
            ["Won", PALETTE.doneGreen],
            ["Lost", PALETTE.stuckRed],
          ],
          done: "Won",
        },
        { key: "value", type: "numbers", title: "Deal value", unit: "$" },
        { key: "close", type: "date", title: "Expected close" },
        { key: "company", type: "text", title: "Company" },
        { key: "priority", type: "status", preset: "priority" },
      ],
      groups: [
        {
          title: "Active deals",
          items: [
            { name: "Northwind — annual plan", values: { owner: [pick(u, 0)], stage: "Proposal", value: 24000, close: 10, company: "Northwind", priority: "High" } },
            { name: "Contoso pilot", values: { owner: [pick(u, 1)], stage: "Qualified", value: 8000, close: 21, company: "Contoso", priority: "Medium" } },
          ],
        },
        { title: "Closed won", color: PALETTE.doneGreen, items: [{ name: "Fabrikam renewal", values: { owner: [pick(u, 0)], stage: "Won", value: 15000, close: -3, company: "Fabrikam", priority: "Medium" } }] },
        { title: "Closed lost", color: PALETTE.stuckRed, items: [] },
      ],
      views: ["kanban", "chart"],
      automations: (r) => [
        { trigger: { type: "status_changes", columnId: r.column("stage"), labelId: r.label("stage", "Won") }, action: { type: "move_to_group", groupId: r.group("Closed won") } },
        { trigger: { type: "status_changes", columnId: r.column("stage"), labelId: r.label("stage", "Lost") }, action: { type: "move_to_group", groupId: r.group("Closed lost") } },
      ],
    }),
  },
  {
    id: "content",
    name: "Content calendar",
    description: "Plan, write and publish content across channels.",
    color: PALETTE.sofiaPink,
    icon: "content",
    build: (u) => ({
      name: "Content calendar",
      itemNoun: "post",
      columns: [
        { key: "writer", type: "people", title: "Writer" },
        {
          key: "status",
          type: "status",
          labels: [
            ["Idea", PALETTE.lilac],
            ["Draft", PALETTE.workingOrange],
            ["In review", PALETTE.purple],
            ["Scheduled", PALETTE.brightBlue],
            ["Published", PALETTE.doneGreen],
          ],
          done: "Published",
        },
        {
          key: "channel",
          type: "tags",
          title: "Channel",
          tags: [
            ["Blog", PALETTE.brightBlue],
            ["Newsletter", PALETTE.workingOrange],
            ["LinkedIn", PALETTE.navy],
            ["Instagram", PALETTE.sofiaPink],
            ["YouTube", PALETTE.stuckRed],
          ],
        },
        { key: "publish", type: "date", title: "Publish date" },
        { key: "rating", type: "rating", title: "Quality" },
      ],
      groups: [
        {
          title: "This month",
          items: [
            { name: "10 tips for remote teams", values: { writer: [pick(u, 0)], status: "In review", channel: ["Blog", "LinkedIn"], publish: 4 } },
            { name: "Product update newsletter", values: { writer: [pick(u, 1)], status: "Draft", channel: ["Newsletter"], publish: 9 } },
            { name: "Customer story video", values: { writer: [pick(u, 2)], status: "Scheduled", channel: ["YouTube"], publish: 2 } },
          ],
        },
        { title: "Ideas", color: PALETTE.lilac, items: [{ name: "Behind the scenes series", values: { status: "Idea", channel: ["Instagram"] } }] },
      ],
      views: ["calendar", "kanban"],
    }),
  },
  {
    id: "team",
    name: "Team tasks",
    description: "A simple weekly task board for any team.",
    color: PALETTE.purple,
    icon: "team",
    build: (u) => ({
      name: "Team tasks",
      itemNoun: "task",
      columns: [
        { key: "owner", type: "people", title: "Owner" },
        { key: "status", type: "status" },
        { key: "priority", type: "status", preset: "priority" },
        { key: "due", type: "date", title: "Due date" },
        { key: "effort", type: "numbers", title: "Effort", unit: "h", unitPosition: "right" },
      ],
      groups: [
        {
          title: "This week",
          items: [
            { name: "Prepare weekly sync agenda", values: { owner: [pick(u, 0)], status: "Working on it", priority: "Medium", due: 1, effort: 1 } },
            { name: "Review open pull requests", values: { owner: [pick(u, 1)], priority: "High", due: 2, effort: 3 } },
          ],
        },
        { title: "Next week", color: PALETTE.purple, items: [{ name: "Quarterly planning draft", values: { owner: [pick(u, 0)], priority: "High", due: 8, effort: 6 } }] },
        { title: "Done", color: PALETTE.doneGreen, items: [] },
      ],
      views: ["kanban", "calendar"],
      automations: (r) => [
        { trigger: { type: "status_changes", columnId: r.column("status"), labelId: r.label("status", "Done") }, action: { type: "move_to_group", groupId: r.group("Done") } },
      ],
    }),
  },
  {
    id: "event",
    name: "Event planning",
    description: "Coordinate venues, vendors and run-of-show on a timeline.",
    color: PALETTE.workingOrange,
    icon: "event",
    build: (u) => ({
      name: "Event planning",
      columns: [
        { key: "owner", type: "people", title: "Owner" },
        { key: "status", type: "status" },
        { key: "timeline", type: "timeline" },
        { key: "budget", type: "numbers", title: "Budget", unit: "$" },
        { key: "vendor", type: "link", title: "Vendor" },
      ],
      groups: [
        {
          title: "Venue & logistics",
          items: [
            { name: "Book the venue", values: { owner: [pick(u, 0)], status: "Done", timeline: [-14, -10], budget: 5000 } },
            { name: "Catering", values: { owner: [pick(u, 1)], status: "Working on it", timeline: [-3, 6], budget: 3200, vendor: { url: "https://example.com", text: "Catering menu" } } },
          ],
        },
        {
          title: "Promotion",
          items: [{ name: "Speaker announcements", values: { owner: [pick(u, 2)], status: "Working on it", timeline: [0, 12], budget: 600 } }],
        },
      ],
      views: ["timeline"],
    }),
  },
];

export function getTemplate(id: string): BoardTemplate {
  return BOARD_TEMPLATES.find((t) => t.id === id) ?? BOARD_TEMPLATES[0];
}
