import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Status = "active" | "expiring_soon" | "expired";

/**
 * Above this many days remaining, a countdown is just noise.
 *
 * This is a *display* choice, not an expiry threshold — the thresholds that
 * decide a status (`EXPIRING_SOON_DAYS`, `EXPIRING_THIS_WEEK_DAYS`) live in the
 * API config. An item only reaches the `active` branch by already being beyond
 * `EXPIRING_SOON_DAYS`, so this constant never needs to match the server.
 */
const ACTIVE_COUNTDOWN_MAX_DAYS = 60;

export function StatusBadge({ status, daysRemaining }: { status: Status; daysRemaining?: number | null }) {
  switch (status) {
    case "expired": {
      const absDays = daysRemaining !== undefined && daysRemaining !== null ? Math.abs(daysRemaining) : null;
      const label =
        daysRemaining !== undefined && daysRemaining !== null && daysRemaining < 0
          ? `${absDays} ${absDays === 1 ? "day" : "days"} overdue`
          : "Expired today";
      return (
        <Badge variant="destructive" className="gap-1.5 px-2.5 py-0.5 font-medium text-xs tracking-tight shrink-0">
          <AlertCircle className="w-3 h-3" />
          {label}
        </Badge>
      );
    }
    case "expiring_soon": {
      const label =
        daysRemaining !== undefined && daysRemaining !== null
          ? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
          : "Expiring soon";
      return (
        <Badge variant="warning" className="gap-1.5 px-2.5 py-0.5 font-medium text-xs tracking-tight shrink-0">
          <Clock className="w-3 h-3" />
          {label}
        </Badge>
      );
    }
    case "active": {
      const showCountdown =
        typeof daysRemaining === "number" &&
        Number.isFinite(daysRemaining) &&
        daysRemaining <= ACTIVE_COUNTDOWN_MAX_DAYS;
      const label = showCountdown
        ? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
        : "Active";
      return (
        <Badge variant="active" className="gap-1.5 px-2.5 py-0.5 font-medium text-xs tracking-tight shrink-0 bg-success/10 text-success border border-success/20">
          <CheckCircle2 className="w-3 h-3" />
          {label}
        </Badge>
      );
    }
    default:
      return null;
  }
}
