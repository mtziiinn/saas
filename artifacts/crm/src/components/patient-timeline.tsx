import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, CalendarClock, FileText, DollarSign } from "lucide-react";

interface TimelineItem {
  type: "activity" | "task" | "treatment" | "transaction";
  id: number;
  title: string;
  description?: string;
  date: string;
}

interface Props {
  items: TimelineItem[];
}

const iconMap = {
  activity: Activity,
  task: CalendarClock,
  treatment: FileText,
  transaction: DollarSign,
};

const colorMap = {
  activity: "bg-primary",
  task: "bg-chart-2",
  treatment: "bg-chart-3",
  transaction: "bg-green-500",
} as Record<string, string>;

export function PatientTimeline({ items }: Props) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Nenhum histórico disponível.</p>;
  }

  return (
    <div className="space-y-0 relative">
      {items.map((item, index) => {
        const Icon = iconMap[item.type] || Activity;
        return (
          <div key={`${item.type}-${item.id}`} className="relative pl-8 pb-6 last:pb-0">
            {index !== items.length - 1 && (
              <div className="absolute left-3.5 top-5 bottom-0 w-px bg-border" />
            )}
            <div className={`absolute left-[5px] top-1 h-6 w-6 rounded-full ${colorMap[item.type] || "bg-primary"} flex items-center justify-center ring-4 ring-background`}>
              <Icon className="h-3 w-3 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(item.date), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
