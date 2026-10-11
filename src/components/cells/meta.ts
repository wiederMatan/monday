import {
  CalendarDays,
  CalendarRange,
  CircleDot,
  Hash,
  History,
  Link2,
  SquareCheck,
  Star,
  Tag,
  Type,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ColumnType } from "@/lib/types";

export const COLUMN_ICONS: Record<ColumnType, LucideIcon> = {
  status: CircleDot,
  people: UserRound,
  date: CalendarDays,
  timeline: CalendarRange,
  numbers: Hash,
  text: Type,
  tags: Tag,
  checkbox: SquareCheck,
  rating: Star,
  link: Link2,
  last_updated: History,
};

export const COLUMN_COLORS: Record<ColumnType, string> = {
  status: "#00c875",
  people: "#579bfc",
  date: "#a25ddc",
  timeline: "#784bd1",
  numbers: "#fdab3d",
  text: "#ffcb00",
  tags: "#ff158a",
  checkbox: "#00c875",
  rating: "#ff6d3b",
  link: "#0086c0",
  last_updated: "#757575",
};
