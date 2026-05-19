import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Appointment {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  contactName?: string | null;
  companyName?: string | null;
}

interface Props {
  appointments: Appointment[];
  onSelectDate?: (date: Date) => void;
}

export function AppointmentCalendar({ appointments, onSelectDate }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of appointments) {
      if (!apt.dueDate) continue;
      const key = format(new Date(apt.dueDate), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(apt);
    }
    return map;
  }, [appointments]);

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {dayNames.map(name => (
          <div key={name} className="bg-muted/50 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {name}
          </div>
        ))}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const dayApps = appointmentsByDay.get(key) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);

          return (
            <button
              key={key}
              onClick={() => onSelectDate?.(day)}
              className={`min-h-20 p-1.5 text-left transition-colors hover:bg-muted/50 ${
                isCurrentMonth ? "bg-card" : "bg-muted/20"
              } ${isTodayDate ? "ring-2 ring-primary ring-inset" : ""}`}
            >
              <span className={`text-xs font-medium ${isTodayDate ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayApps.slice(0, 3).map(apt => (
                  <div
                    key={apt.id}
                    className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${
                      apt.status === "done"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : apt.priority === "high"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        : "bg-primary/10 text-primary dark:bg-primary/20"
                    }`}
                  >
                    {apt.title}
                  </div>
                ))}
                {dayApps.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{dayApps.length - 3} mais</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
