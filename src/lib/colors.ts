/** monday-style content colors, used for status labels, tags and groups. */
export const PALETTE = {
  doneGreen: "#00c875",
  grassGreen: "#037f4c",
  brightGreen: "#9cd326",
  saladish: "#cab641",
  eggYolk: "#ffcb00",
  workingOrange: "#fdab3d",
  darkOrange: "#ff6d3b",
  peach: "#ffadad",
  sunset: "#ff7575",
  stuckRed: "#df2f4a",
  darkRed: "#bb3354",
  sofiaPink: "#ff158a",
  lipstick: "#ff5ac4",
  bubble: "#faa1f1",
  purple: "#9d50dd",
  darkPurple: "#784bd1",
  berry: "#7e3b8a",
  darkIndigo: "#401694",
  indigo: "#5559df",
  navy: "#225091",
  brightBlue: "#579bfc",
  darkBlue: "#007eb5",
  aquamarine: "#4eccc6",
  chiliBlue: "#66ccff",
  river: "#68a1bd",
  winter: "#9aadbd",
  explosive: "#c4c4c4",
  americanGray: "#757575",
  blackish: "#333333",
  brown: "#7f5347",
  orchid: "#e484bd",
  tan: "#bca58a",
  sky: "#a1e3f6",
  coffee: "#cd9282",
  royal: "#2b76e5",
  teal: "#175a63",
  lavender: "#bda8f9",
  steel: "#a9bee8",
  lilac: "#9d99b9",
  pecan: "#563e3e",
} as const;

/** Label/tag picker palette, in display order. */
export const LABEL_COLORS: string[] = [
  PALETTE.doneGreen,
  PALETTE.workingOrange,
  PALETTE.stuckRed,
  PALETTE.brightBlue,
  PALETTE.purple,
  PALETTE.grassGreen,
  PALETTE.eggYolk,
  PALETTE.darkOrange,
  PALETTE.sofiaPink,
  PALETTE.darkPurple,
  PALETTE.indigo,
  PALETTE.darkIndigo,
  PALETTE.chiliBlue,
  PALETTE.aquamarine,
  PALETTE.brightGreen,
  PALETTE.saladish,
  PALETTE.peach,
  PALETTE.sunset,
  PALETTE.darkRed,
  PALETTE.lipstick,
  PALETTE.bubble,
  PALETTE.berry,
  PALETTE.navy,
  PALETTE.darkBlue,
  PALETTE.river,
  PALETTE.winter,
  PALETTE.royal,
  PALETTE.teal,
  PALETTE.lavender,
  PALETTE.steel,
  PALETTE.lilac,
  PALETTE.brown,
  PALETTE.tan,
  PALETTE.coffee,
  PALETTE.pecan,
  PALETTE.americanGray,
  PALETTE.blackish,
  PALETTE.explosive,
];

/** Group colors cycle in this order when new groups are created. */
export const GROUP_COLORS: string[] = [
  PALETTE.brightBlue,
  PALETTE.purple,
  PALETTE.doneGreen,
  PALETTE.workingOrange,
  PALETTE.stuckRed,
  PALETTE.grassGreen,
  PALETTE.darkOrange,
  PALETTE.eggYolk,
  PALETTE.brightGreen,
  PALETTE.sofiaPink,
  PALETTE.darkPurple,
  PALETTE.chiliBlue,
  PALETTE.darkRed,
  PALETTE.brown,
  PALETTE.americanGray,
];

export const AVATAR_COLORS: string[] = [
  "#0073ea",
  "#e2445c",
  "#00a359",
  "#a25ddc",
  "#ff642e",
  "#037f4c",
  "#784bd1",
  "#bb3354",
  "#225091",
  "#cc5c00",
  "#175a63",
  "#7f5347",
];

/** Gray shown for an empty status cell (monday's "default" label). */
export const EMPTY_LABEL_COLOR = PALETTE.explosive;

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * White text on saturated labels (as monday does), but switch to dark text on
 * pale colors where white would be unreadable.
 */
export function readableTextColor(background: string): string {
  return luminance(background) > 0.55 ? "#323338" : "#ffffff";
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function nextGroupColor(used: string[]): string {
  const unused = GROUP_COLORS.find((c) => !used.includes(c));
  return unused ?? GROUP_COLORS[used.length % GROUP_COLORS.length];
}

export function nextLabelColor(used: string[]): string {
  const unused = LABEL_COLORS.find((c) => !used.includes(c));
  return unused ?? LABEL_COLORS[used.length % LABEL_COLORS.length];
}
