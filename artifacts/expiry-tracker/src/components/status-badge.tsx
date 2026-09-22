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
    case "expired":
      return (
        <Badge variant="destructive" className="gap-1 px-2 py-0.5">
          <AlertCircle className="w-3 h-3" />
          {daysRemaining !== undefined && daysRemaining !== null && daysRemaining < 0
            ? `${Math.abs(daysRemaining)} days overdue`
            : "Expired today"}
        </Badge>
      );
    case "expiring_soon":
      return (
        <Badge variant="warning" className="gap-1 px-2 py-0.5">
          <Clock className="w-3 h-3" />
          {daysRemaining !== undefined && daysRemaining !== null
            ? `${daysRemaining} days left`
            : "Expiring soon"}
        </Badge>
      );
    case "active":
      return (
        <Badge variant="active" className="gap-1 px-2 py-0.5 bg-success/10 text-success">
          <CheckCircle2 className="w-3 h-3" />
          {typeof daysRemaining === "number" &&
          Number.isFinite(daysRemaining) &&
          daysRemaining <= ACTIVE_COUNTDOWN_MAX_DAYS
            ? `${daysRemaining} days left`
            : "Active"}
        </Badge>
      );
    default:
      return null;
  }
}
