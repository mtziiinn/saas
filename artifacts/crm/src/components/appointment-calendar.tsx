import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, addMonths, subMonths, addWeeks, subWeeks, startOfWeek as weekStart, endOfWeek as weekEnd, parseISO, addDays, isSameDay as isSameDayFn } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Appointment {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  contactName?: string | null;
  companyName?: string | null;
}

interface Props {
  appointments: Appointment[];
  onSelectDate?: (date: Date) => void;
  onSelectAppointment?: (id: number) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

export function AppointmentCalendar({ appointments, onSelectDate, onSelectAppointment }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");

  const days = useMemo(() => {
    if (view === "week") {
      const start = weekStart(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate, view]);

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

  function navigate(direction: 1 | -1) {
    if (view === "week") {
      setCurrentDate(direction === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  }

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const headerLabel = view === "week"
    ? `${format(days[0], "d 'de' MMM", { locale: ptBR })} - ${format(days[6], "d 'de' MMM", { locale: ptBR })}`
    : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setView("month")}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${view === "month" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              <CalendarDays className="h-3.5 w-3.5 inline mr-1" />
              Mês
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${view === "week" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5 inline mr-1" />
              Semana
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold min-w-40 text-center">{headerLabel}</h3>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === "week" ? (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-8 gap-px bg-border rounded-t-lg overflow-hidden">
              <div className="bg-muted/50 px-2 py-2 text-center text-xs font-medium text-muted-foreground" />
              {days.map(day => (
                <div
                  key={format(day, "yyyy-MM-dd")}
                  className={`bg-muted/50 px-2 py-2 text-center ${isToday(day) ? "bg-primary/10" : ""}`}
                >
                  <div className="text-xs font-medium text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</div>
                  <div className={`text-lg font-semibold ${isToday(day) ? "text-primary" : "text-foreground"}`}>
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>
            <div className="divide-y border-x border-b rounded-b-lg">
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-8 gap-px min-h-[48px]">
                  <div className="px-2 py-1 text-xs text-muted-foreground text-right pr-3 pt-2">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {days.map(day => {
                    const key = format(day, "yyyy-MM-dd");
                    const dayApps = appointmentsByDay.get(key) || [];
                    const appsAtHour = dayApps.filter(apt => {
                      if (!apt.startTime) return false;
                      const aptHour = parseInt(apt.startTime.split(":")[0], 10);
                      return aptHour === hour;
                    });
                    const isTodayDate = isToday(day);

                    return (
                      <button
                        key={`${key}-${hour}`}
                        onClick={() => onSelectDate?.(day)}
                        className={`relative min-h-[48px] p-0.5 text-left transition-colors hover:bg-muted/30 ${
                          isTodayDate ? "bg-primary/5" : "bg-card"
                        }`}
                      >
                        {appsAtHour.map(apt => (
                          <div
                            key={apt.id}
                            onClick={e => { e.stopPropagation(); onSelectAppointment?.(apt.id); }}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer mb-0.5 ${
                              apt.status === "done"
                                ? "bg-green-100 text-green-700"
                                : apt.priority === "high"
                                ? "bg-red-100 text-red-700"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {apt.startTime} {apt.title}
                          </div>
                        ))}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {dayNames.map(name => (
            <div key={name} className="bg-muted/50 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              {name}
            </div>
          ))}
          {days.map(day => {
            const key = format(day, "yyyy-MM-dd");
            const dayApps = appointmentsByDay.get(key) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
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
                          ? "bg-green-100 text-green-700"
                          : apt.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {apt.startTime && `${apt.startTime} `}{apt.title}
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
      )}
    </div>
  );
}
