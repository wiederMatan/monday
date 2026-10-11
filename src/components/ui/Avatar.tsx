import { UserRound } from "lucide-react";
import type { User } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { Tip } from "./Tooltip";

export function Avatar({
  user,
  size = 28,
  className,
  tooltip = false,
}: {
  user?: Pick<User, "name" | "color"> | null;
  size?: number;
  className?: string;
  tooltip?: boolean;
}) {
  if (!user) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-empty text-white", className)}
        style={{ width: size, height: size }}
      >
        <UserRound size={Math.round(size * 0.6)} />
      </span>
    );
  }
  const avatar = (
    <span
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: user.color, fontSize: Math.max(9, Math.round(size * 0.38)) }}
      aria-label={user.name}
      role="img"
    >
      {initials(user.name)}
    </span>
  );
  return tooltip ? <Tip content={user.name}>{avatar}</Tip> : avatar;
}

export function AvatarStack({
  users,
  max = 3,
  size = 26,
  className,
}: {
  users: Array<Pick<User, "id" | "name" | "color">>;
  max?: number;
  size?: number;
  className?: string;
}) {
  const visible = users.length > max ? users.slice(0, max - 1) : users;
  const extra = users.length - visible.length;
  return (
    <span className={cn("inline-flex items-center", className)}>
      {visible.map((user, index) => (
        <Avatar key={user.id} user={user} size={size} className={cn("ring-2 ring-surface", index > 0 && "-ml-2")} />
      ))}
      {extra > 0 ? (
        <span
          className="-ml-2 inline-flex shrink-0 items-center justify-center rounded-full bg-[#323338] font-semibold text-white ring-2 ring-surface dark:bg-[#5d6080]"
          style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.36)) }}
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
}
