import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Status = "active" | "expiring_soon" | "expired";

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
      let activeText = "Active";
      if (daysRemaining !== undefined && daysRemaining !== null) {
        if (daysRemaining <= 60 && daysRemaining >= 31) {
          activeText = `${daysRemaining} days left`;
        }
      }
      return (
        <Badge variant="active" className="gap-1 px-2 py-0.5 bg-opacity-10 text-[#10b981]">
          <CheckCircle2 className="w-3 h-3" />
          {activeText}
        </Badge>
      );
    default:
      return null;
  }
}
