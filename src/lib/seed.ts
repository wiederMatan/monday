import { buildBoard, type BoardSpec, type BuildContext } from "./builder";
import { PALETTE } from "./colors";
import { getLabel } from "./columns";
import type { Activity, AppNotification, Board, DataState, ID, Item, Update, User, Workspace } from "./types";

export const SCHEMA_VERSION = 1;

export const ME = "user_me";
const NOA = "user_noa";
const DANIEL = "user_daniel";
const MAYA = "user_maya";
const OMER = "user_omer";
const TAMAR = "user_tamar";
const ALEX = "user_alex";
const YAEL = "user_yael";

export const SEED_USERS: User[] = [
  { id: ME, name: "Matan Wieder", email: "matan@example.com", title: "Product Lead", color: "#0073ea" },
  { id: NOA, name: "Noa Levi", email: "noa@example.com", title: "Product Designer", color: "#e2445c" },
  { id: DANIEL, name: "Daniel Cohen", email: "daniel@example.com", title: "Frontend Engineer", color: "#00a359" },
  { id: MAYA, name: "Maya Rosen", email: "maya@example.com", title: "Marketing Manager", color: "#a25ddc" },
  { id: OMER, name: "Omer Shapira", email: "omer@example.com", title: "Backend Engineer", color: "#ff642e" },
  { id: TAMAR, name: "Tamar Katz", email: "tamar@example.com", title: "QA Lead", color: "#037f4c" },
  { id: ALEX, name: "Alex Morgan", email: "alex@example.com", title: "Account Executive", color: "#784bd1" },
  { id: YAEL, name: "Yael Ben-David", email: "yael@example.com", title: "Content Writer", color: "#bb3354" },
];

const MAIN_WS = "ws_main";
const MARKETING_WS = "ws_marketing";

const WORKSPACES: Workspace[] = [
  { id: MAIN_WS, name: "Main workspace", color: "#0073ea" },
  { id: MARKETING_WS, name: "Marketing & Sales", color: "#a25ddc" },
];

const roadmap: BoardSpec = {
  name: "Product Roadmap",
  description: "Everything the product team is shipping this quarter. Status changes to Done move items to Completed automatically.",
  itemNoun: "task",
  favorite: true,
  memberIds: [ME, NOA, DANIEL, OMER, TAMAR],
  columns: [
    { key: "owner", type: "people", title: "Owner" },
    {
      key: "status",
      type: "status",
      labels: [
        ["Working on it", PALETTE.workingOrange],
        ["Done", PALETTE.doneGreen],
        ["Stuck", PALETTE.stuckRed],
        ["In review", PALETTE.purple],
      ],
    },
    { key: "priority", type: "status", preset: "priority" },
    { key: "due", type: "date", title: "Due date" },
    { key: "timeline", type: "timeline" },
    { key: "effort", type: "numbers", title: "Effort", unit: "pts", unitPosition: "right" },
    {
      key: "tags",
      type: "tags",
      title: "Area",
      tags: [
        ["Frontend", PALETTE.brightBlue],
        ["Backend", PALETTE.purple],
        ["Design", PALETTE.sofiaPink],
        ["Mobile", PALETTE.grassGreen],
        ["Infra", PALETTE.americanGray],
      ],
    },
    { key: "updated", type: "last_updated" },
  ],
  groups: [
    {
      title: "This sprint",
      color: PALETTE.brightBlue,
      items: [
        {
          name: "Redesign onboarding flow",
          createdBy: NOA,
          values: { owner: [NOA, ME], status: "Working on it", priority: "High", due: 2, timeline: [-4, 2], effort: 8, tags: ["Design", "Frontend"] },
          subitems: [
            { name: "Welcome screen", values: { owner: [NOA], status: "Done", date: -2 } },
            { name: "Workspace setup step", values: { owner: [DANIEL], status: "Working on it", date: 1 } },
            { name: "Invite teammates step", values: { owner: [NOA], date: 3 } },
          ],
          updates: [
            {
              authorId: NOA,
              body: "First round of mockups is ready in Figma 🎨\n@Matan Wieder would love your feedback on the welcome screen before Thursday.",
              hoursAgo: 5,
              likes: [ME, DANIEL],
              replies: [
                { authorId: ME, body: "Looks great! Let's simplify step 3 — two fields max.", hoursAgo: 3, likes: [NOA] },
                { authorId: DANIEL, body: "I can start building the new stepper component tomorrow.", hoursAgo: 2 },
              ],
            },
            { authorId: ME, body: "Kicking this off — goal is to cut time-to-first-board in half.", hoursAgo: 96 },
          ],
        },
        {
          name: "Two-factor authentication",
          createdBy: OMER,
          values: { owner: [OMER], status: "Stuck", priority: "Critical ⚠️", due: -1, timeline: [-7, -1], effort: 13, tags: ["Backend"] },
          updates: [{ authorId: OMER, body: "Blocked on the SMS provider contract — waiting for legal to sign off.", hoursAgo: 20, likes: [TAMAR] }],
        },
        {
          name: "Dark mode support",
          createdBy: DANIEL,
          values: { owner: [DANIEL], status: "Working on it", priority: "Medium", due: 5, timeline: [-1, 5], effort: 5, tags: ["Frontend"] },
        },
        {
          name: "Mobile push notifications",
          createdBy: DANIEL,
          values: { owner: [DANIEL, OMER], status: "In review", priority: "Medium", due: 0, timeline: [-3, 0], effort: 8, tags: ["Mobile", "Backend"] },
          updates: [{ authorId: DANIEL, body: "PR is up for review: deep links now open the right item. @Omer Shapira can you check the payload format?", hoursAgo: 7 }],
        },
        {
          name: "Fix flaky checkout tests",
          createdBy: TAMAR,
          values: { owner: [TAMAR], status: "Working on it", priority: "High", due: 1, timeline: [-2, 1], effort: 3, tags: ["Infra"] },
        },
      ],
    },
    {
      title: "Next sprint",
      color: PALETTE.purple,
      items: [
        {
          name: "Public API v2",
          createdBy: OMER,
          values: { owner: [OMER], priority: "High", due: 12, timeline: [8, 20], effort: 21, tags: ["Backend"] },
          subitems: [
            { name: "Rate limiting", values: { owner: [OMER], date: 14 } },
            { name: "OpenAPI reference docs", values: { owner: [ME], date: 18 } },
          ],
        },
        { name: "Workspace permissions", createdBy: ME, values: { owner: [ME], priority: "Medium", due: 16, timeline: [10, 18], effort: 8, tags: ["Backend", "Frontend"] } },
        { name: "Usage analytics dashboard", createdBy: NOA, values: { owner: [DANIEL, NOA], priority: "Low", due: 19, timeline: [12, 24], effort: 13, tags: ["Frontend", "Design"] } },
        { name: "Improve search relevance", createdBy: OMER, values: { owner: [OMER], priority: "Medium", due: 10, timeline: [7, 14], effort: 5, tags: ["Backend"] } },
      ],
    },
    {
      title: "Backlog",
      color: PALETTE.americanGray,
      items: [
        { name: "Offline mode for mobile", values: { priority: "Low", effort: 21, tags: ["Mobile"] } },
        { name: "Import boards from CSV", values: { priority: "Low", effort: 8, tags: ["Frontend"] } },
        { name: "SSO with Okta", createdBy: OMER, values: { owner: [OMER], priority: "Medium", effort: 13, tags: ["Backend", "Infra"] } },
      ],
    },
    {
      title: "Completed",
      color: PALETTE.doneGreen,
      items: [
        { name: "Launch new pricing page", daysAgo: 25, values: { owner: [MAYA, NOA], status: "Done", priority: "High", due: -12, timeline: [-20, -12], effort: 8, tags: ["Design", "Frontend"] } },
        { name: "Migrate to Postgres 17", daysAgo: 20, createdBy: OMER, values: { owner: [OMER], status: "Done", priority: "Critical ⚠️", due: -9, timeline: [-16, -9], effort: 13, tags: ["Infra", "Backend"] } },
        {
          name: "Accessibility audit fixes",
          daysAgo: 12,
          values: { owner: [DANIEL, TAMAR], status: "Done", priority: "Medium", due: -5, timeline: [-10, -5], effort: 5, tags: ["Frontend"] },
          updates: [{ authorId: TAMAR, body: "All 23 issues verified with VoiceOver and NVDA ✅", hoursAgo: 110, likes: [ME, DANIEL, NOA] }],
        },
      ],
    },
  ],
  views: ["kanban", "timeline", "calendar", "chart"],
  automations: (r) => [
    { trigger: { type: "status_changes", columnId: r.column("status"), labelId: r.label("status", "Done") }, action: { type: "move_to_group", groupId: r.group("Completed") } },
    { trigger: { type: "status_changes", columnId: r.column("status"), labelId: r.label("status", "Stuck") }, action: { type: "notify", userId: ME } },
  ],
};

const bugs: BoardSpec = {
  name: "Bug Tracker",
  description: "Report bugs here. New bugs start as New; Fixed bugs move to the Fixed group.",
  itemNoun: "bug",
  memberIds: [ME, DANIEL, OMER, TAMAR],
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
    { key: "reporter", type: "people", title: "Reported by" },
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
        {
          name: "Login fails on Safari with SSO",
          createdBy: TAMAR,
          values: { status: "New", severity: "Critical ⚠️", dev: [OMER], reporter: [TAMAR], reported: -1, platform: ["Web"] },
          updates: [{ authorId: TAMAR, body: "Repro: Safari 18, SSO via Google, third-party cookies blocked. Redirect loops back to /login.", hoursAgo: 26 }],
        },
        { name: "Badge count wrong after reading", createdBy: TAMAR, values: { status: "In progress", severity: "Medium", dev: [DANIEL], reporter: [TAMAR], reported: -3, platform: ["iOS"] } },
        { name: "Crash when uploading large files", createdBy: NOA, values: { status: "In progress", severity: "High", dev: [OMER], reporter: [NOA], reported: -2, platform: ["Android", "API"] } },
        { name: "Date picker shows wrong week start", createdBy: MAYA, values: { status: "Needs info", severity: "Low", dev: [DANIEL], reporter: [MAYA], reported: -6, platform: ["Web"] } },
        { name: "Typo in billing email", createdBy: ALEX, values: { status: "New", severity: "Low", reporter: [ALEX], reported: 0, platform: ["API"] } },
      ],
    },
    {
      title: "Fixed",
      color: PALETTE.doneGreen,
      items: [
        { name: "CSV export drops Hebrew characters", daysAgo: 9, values: { status: "Fixed", severity: "High", dev: [DANIEL], reporter: [ME], reported: -8, platform: ["Web"], verified: true } },
        { name: "Memory leak in board view", daysAgo: 12, values: { status: "Fixed", severity: "Critical ⚠️", dev: [DANIEL], reporter: [TAMAR], reported: -11, platform: ["Web"], verified: true } },
        { name: "Avatar upload rotates photos", daysAgo: 15, values: { status: "Fixed", severity: "Medium", dev: [OMER], reporter: [YAEL], reported: -14, platform: ["iOS", "Android"] } },
      ],
    },
  ],
  views: ["kanban", "chart"],
  automations: (r) => [
    { trigger: { type: "item_created" }, action: { type: "set_status", columnId: r.column("status"), labelId: r.label("status", "New") } },
    { trigger: { type: "status_changes", columnId: r.column("status"), labelId: r.label("status", "Fixed") }, action: { type: "move_to_group", groupId: r.group("Fixed") } },
  ],
};

const campaigns: BoardSpec = {
  name: "Marketing Campaigns",
  description: "Q4 campaigns, budgets and results.",
  itemNoun: "campaign",
  favorite: true,
  memberIds: [ME, MAYA, YAEL, ALEX, NOA],
  columns: [
    { key: "owner", type: "people", title: "Owner" },
    {
      key: "status",
      type: "status",
      labels: [
        ["Planning", PALETTE.purple],
        ["Working on it", PALETTE.workingOrange],
        ["Live", PALETTE.doneGreen],
        ["Done", PALETTE.grassGreen],
        ["Stuck", PALETTE.stuckRed],
      ],
    },
    {
      key: "channel",
      type: "tags",
      title: "Channel",
      tags: [
        ["Email", PALETTE.brightBlue],
        ["Social", PALETTE.sofiaPink],
        ["Paid ads", PALETTE.workingOrange],
        ["Events", PALETTE.purple],
        ["SEO", PALETTE.grassGreen],
      ],
    },
    { key: "launch", type: "date", title: "Launch date" },
    { key: "budget", type: "numbers", title: "Budget", unit: "$" },
    { key: "leads", type: "numbers", title: "Leads" },
    { key: "rating", type: "rating", title: "Impact" },
    { key: "brief", type: "link", title: "Brief" },
  ],
  groups: [
    {
      title: "Q4 campaigns",
      color: PALETTE.workingOrange,
      items: [
        {
          name: "Black Friday email series",
          createdBy: MAYA,
          values: { owner: [MAYA], status: "Working on it", channel: ["Email"], launch: 18, budget: 4500, brief: { url: "https://example.com/black-friday", text: "Campaign brief" } },
          subitems: [
            { name: "Write email copy", values: { owner: [YAEL], status: "Done", date: 5 } },
            { name: "Design templates", values: { owner: [NOA], status: "Working on it", date: 10 } },
          ],
          updates: [{ authorId: MAYA, body: "Subject lines are in the brief — vote with a 👍 on your favorite!", hoursAgo: 30, likes: [YAEL, ME] }],
        },
        { name: "Product Hunt launch", createdBy: ME, values: { owner: [MAYA, ME], status: "Planning", channel: ["Social", "Events"], launch: 11, budget: 2000, brief: { url: "https://www.producthunt.com", text: "Launch page" } } },
        { name: "Customer webinar: automations", createdBy: MAYA, values: { owner: [MAYA, NOA], status: "Working on it", channel: ["Events", "Email"], launch: 6, budget: 1500 } },
        { name: "Retargeting ads refresh", createdBy: ALEX, values: { owner: [ALEX], status: "Stuck", channel: ["Paid ads"], launch: -2, budget: 6000, rating: 2 } },
      ],
    },
    {
      title: "Always-on",
      color: PALETTE.aquamarine,
      items: [
        { name: "LinkedIn thought leadership", createdBy: YAEL, values: { owner: [YAEL], status: "Live", channel: ["Social"], launch: -10, budget: 1200, leads: 86, rating: 4 } },
        { name: "Google Ads — brand terms", createdBy: ALEX, values: { owner: [ALEX], status: "Live", channel: ["Paid ads"], launch: -30, budget: 8000, leads: 312, rating: 3, brief: { url: "https://ads.google.com", text: "Ads dashboard" } } },
        { name: "SEO content refresh", createdBy: YAEL, values: { owner: [YAEL], status: "Live", channel: ["SEO"], launch: -20, budget: 900, leads: 140, rating: 5 } },
      ],
    },
    {
      title: "Wrapped up",
      color: PALETTE.doneGreen,
      collapsed: true,
      items: [
        { name: "Summer promo", daysAgo: 70, values: { owner: [MAYA], status: "Done", channel: ["Email", "Social"], launch: -60, budget: 3000, leads: 420, rating: 4 } },
        { name: "Partner co-marketing", daysAgo: 50, values: { owner: [ALEX], status: "Done", channel: ["Events"], launch: -45, budget: 2500, leads: 95, rating: 3 } },
      ],
    },
  ],
  views: ["kanban", "calendar", "chart"],
};

const pipeline: BoardSpec = {
  name: "Sales Pipeline",
  description: "Deals by stage. Won and lost deals file themselves.",
  itemNoun: "deal",
  memberIds: [ME, ALEX, MAYA],
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
    { key: "probability", type: "numbers", title: "Probability", unit: "%", unitPosition: "right", summary: "avg" },
    { key: "close", type: "date", title: "Expected close" },
    { key: "company", type: "text", title: "Company" },
    { key: "priority", type: "status", preset: "priority" },
  ],
  groups: [
    {
      title: "Active deals",
      color: PALETTE.brightBlue,
      items: [
        { name: "Acme Corp — Enterprise plan", createdBy: ALEX, values: { owner: [ALEX], stage: "Negotiation", value: 48000, probability: 70, close: 7, company: "Acme Corp", priority: "High" } },
        { name: "Globex — team expansion", createdBy: ALEX, values: { owner: [ALEX, ME], stage: "Proposal", value: 18500, probability: 50, close: 14, company: "Globex", priority: "Medium" } },
        { name: "Initech pilot", createdBy: ALEX, values: { owner: [ALEX], stage: "Qualified", value: 9000, probability: 30, close: 25, company: "Initech", priority: "Low" } },
        { name: "Umbrella Health", createdBy: ME, values: { owner: [ME], stage: "Lead", value: 32000, probability: 15, close: 40, company: "Umbrella Health", priority: "High" } },
      ],
    },
    {
      title: "Closed won",
      color: PALETTE.doneGreen,
      items: [
        { name: "Stark Industries renewal", daysAgo: 20, createdBy: ALEX, values: { owner: [ALEX], stage: "Won", value: 64000, probability: 100, close: -5, company: "Stark Industries", priority: "Critical ⚠️" } },
        { name: "Wayne Enterprises", daysAgo: 30, createdBy: ALEX, values: { owner: [ALEX], stage: "Won", value: 27000, probability: 100, close: -18, company: "Wayne Enterprises", priority: "Medium" } },
      ],
    },
    {
      title: "Closed lost",
      color: PALETTE.stuckRed,
      items: [{ name: "Hooli", daysAgo: 25, createdBy: ALEX, values: { owner: [ALEX], stage: "Lost", value: 12000, probability: 0, close: -9, company: "Hooli", priority: "Low" } }],
    },
  ],
  views: ["kanban", "chart"],
  automations: (r) => [
    { trigger: { type: "status_changes", columnId: r.column("stage"), labelId: r.label("stage", "Won") }, action: { type: "move_to_group", groupId: r.group("Closed won") } },
    { trigger: { type: "status_changes", columnId: r.column("stage"), labelId: r.label("stage", "Lost") }, action: { type: "move_to_group", groupId: r.group("Closed lost") } },
  ],
};

const HOUR = 60 * 60 * 1000;

/** Deterministic ids keep seeded URLs stable even before the first save. */
function seedIdGenerator(): (prefix: string) => string {
  let counter = 0;
  return (prefix) => `${prefix}_s${(counter += 1).toString(36)}`;
}

/** Synthesizes a believable activity history for seeded items. */
function seedActivity(board: Board, items: Item[], id: (prefix: string) => string, now: number): Activity[] {
  const statusColumn = board.columns.find((c) => c.type === "status");
  const peopleColumn = board.columns.find((c) => c.type === "people");
  const entries: Activity[] = [];
  for (const item of items) {
    entries.push({
      id: id("act"),
      boardId: board.id,
      itemId: item.id,
      itemName: item.name,
      userId: item.createdBy,
      kind: "item_created",
      createdAt: item.createdAt,
      text: board.groups.find((g) => g.id === item.groupId)?.title,
    });
    const label = statusColumn ? getLabel(statusColumn, item.values[statusColumn.id]) : undefined;
    if (statusColumn && label) {
      const owners = peopleColumn ? (item.values[peopleColumn.id] as string[] | undefined) : undefined;
      const changedAt = Math.min(now - HOUR, item.createdAt + 26 * HOUR);
      entries.push({
        id: id("act"),
        boardId: board.id,
        itemId: item.id,
        itemName: item.name,
        userId: owners?.[0] ?? item.createdBy,
        kind: "value_changed",
        createdAt: changedAt,
        columnId: statusColumn.id,
        columnTitle: statusColumn.title,
        columnType: "status",
        from: "",
        to: label.name,
        toColor: label.color,
      });
    }
  }
  return entries;
}

export function createSeedState(now: number = Date.now(), today: Date = new Date()): DataState {
  const id = seedIdGenerator();
  const ctx: BuildContext = { id, now, today, userId: ME };
  const specs: Array<[BoardSpec, ID]> = [
    [roadmap, MAIN_WS],
    [bugs, MAIN_WS],
    [campaigns, MARKETING_WS],
    [pipeline, MARKETING_WS],
  ];

  const boards: Record<ID, Board> = {};
  const boardOrder: ID[] = [];
  const items: Record<ID, Item> = {};
  const updates: Record<ID, Update> = {};
  let activity: Activity[] = [];

  for (const [spec, workspaceId] of specs) {
    const built = buildBoard(spec, workspaceId, ctx);
    boards[built.board.id] = built.board;
    boardOrder.push(built.board.id);
    for (const item of built.items) items[item.id] = item;
    for (const update of built.updates) updates[update.id] = update;
    activity = activity.concat(seedActivity(built.board, built.items, id, now));
  }
  activity.sort((a, b) => b.createdAt - a.createdAt);

  const [roadmapId, bugsId, campaignsId, pipelineId] = boardOrder;
  const findItem = (boardId: ID, name: string) => Object.values(items).find((i) => i.boardId === boardId && i.name === name)?.id ?? null;

  const notifications: AppNotification[] = [
    {
      id: id("ntf"),
      actorId: NOA,
      kind: "mention",
      text: "mentioned you in an update on “Redesign onboarding flow”",
      boardId: roadmapId,
      itemId: findItem(roadmapId, "Redesign onboarding flow"),
      createdAt: now - 5 * HOUR,
      read: false,
    },
    {
      id: id("ntf"),
      actorId: OMER,
      kind: "automation",
      text: "When Status changes to Stuck: “Two-factor authentication”",
      boardId: roadmapId,
      itemId: findItem(roadmapId, "Two-factor authentication"),
      createdAt: now - 20 * HOUR,
      read: false,
    },
    {
      id: id("ntf"),
      actorId: ALEX,
      kind: "assigned",
      text: "assigned you to “Globex — team expansion”",
      boardId: pipelineId,
      itemId: findItem(pipelineId, "Globex — team expansion"),
      createdAt: now - 28 * HOUR,
      read: false,
    },
    {
      id: id("ntf"),
      actorId: MAYA,
      kind: "update",
      text: "posted an update on “Black Friday email series”",
      boardId: campaignsId,
      itemId: findItem(campaignsId, "Black Friday email series"),
      createdAt: now - 30 * HOUR,
      read: true,
    },
    {
      id: id("ntf"),
      actorId: TAMAR,
      kind: "reply",
      text: "replied on “Login fails on Safari with SSO”",
      boardId: bugsId,
      itemId: findItem(bugsId, "Login fails on Safari with SSO"),
      createdAt: now - 50 * HOUR,
      read: true,
    },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    currentUserId: ME,
    users: SEED_USERS.map((u) => ({ ...u })),
    workspaces: WORKSPACES.map((w) => ({ ...w })),
    activeWorkspaceId: MAIN_WS,
    boards,
    boardOrder,
    items,
    updates,
    activity,
    notifications,
    recentBoardIds: [roadmapId, bugsId, campaignsId],
    preferences: { theme: "light", sidebarCollapsed: false },
  };
}
