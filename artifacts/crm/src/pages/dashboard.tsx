import { useGetRecentActivity, useGetUpcomingTasks, useGetContactsByStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, CheckSquare, AlertCircle, Activity, CalendarClock, UserPlus, TrendingUp, TrendingDown, Bell, FileText, Send, Check, X, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { accessToken } = useAuth();
  
  const { data: activities, isLoading: activitiesLoading } = useGetRecentActivity({
    query: { enabled: !!accessToken }
  });
  const { data: tasks, isLoading: tasksLoading } = useGetUpcomingTasks({
    query: { enabled: !!accessToken }
  });
  const { data: contactsByStatus, isLoading: contactsByStatusLoading } = useGetContactsByStatus({
    query: { enabled: !!accessToken }
  });

  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pendingQuotes, setPendingQuotes] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setStatsLoading(true);
    fetch("/api/dashboard/stats", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
    fetch("/api/dashboard/pending-quotes", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then(setPendingQuotes)
      .catch(() => {})
      .finally(() => setQuotesLoading(false));
  }, [accessToken]);

  const STATUS_COLORS: Record<string, string> = {
    lead: "hsl(var(--primary))",
    prospect: "hsl(var(--chart-2, 280 65% 60%))",
    client: "hsl(var(--chart-3, 160 60% 45%))",
    churned: "hsl(var(--muted-foreground))"
  };

  const todayTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(t => t.dueDate && isToday(parseISO(t.dueDate)));
  }, [tasks]);

  async function sendReminder(task: any) {
    if (!task.contactId) {
      toast({ title: "Paciente não vinculado", description: "Vincule um paciente ao agendamento para enviar lembrete." });
      return;
    }
    try {
      await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          contactId: task.contactId,
          taskId: task.id,
          type: "email",
          message: `Lembrete: ${task.title} em ${task.dueDate ? format(parseISO(task.dueDate), "dd/MM/yyyy") : "breve"}.`,
        }),
      });
      toast({ title: "Lembrete enviado com sucesso!" });
    } catch {
      toast({ title: "Erro ao enviar lembrete", variant: "destructive" });
    }
  }

  const getStatusColor = (status: string) => STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS.churned;

  const taskChartData = stats ? [
    { name: "Concluídos", count: stats.tasksDone, fill: "hsl(var(--primary))" },
    { name: "Abertos", count: stats.totalTasks - stats.tasksDone, fill: "hsl(var(--muted-foreground))" },
    { name: "Atrasados", count: stats.tasksOverdue, fill: "hsl(var(--destructive))" },
  ] : [];

  const activityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "contact": return <UserPlus className="w-4 h-4 text-primary" />;
      case "task": return <CheckSquare className="w-4 h-4 text-orange-500" />;
      case "quote": return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral da sua clínica.</p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContacts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-500 font-medium">+{stats.newContactsThisMonth}</span> este mês
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
              <CalendarClock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasksDueToday}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.tasksOverdue > 0 && (
                  <span className="text-destructive font-medium">{stats.tasksOverdue} atrasados</span>
                )}
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats.monthIncome.toLocaleString("pt-BR")}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo: R$ {(stats.monthIncome - stats.monthExpense).toLocaleString("pt-BR")}
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissões Pendentes</CardTitle>
              <Percent className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats.pendingCommissionsAmount.toLocaleString("pt-BR")}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingCommissionsCount} comissões a pagar
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agendamentos de Hoje</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Seus próximos atendimentos.</p>
              </div>
              <Link href="/tasks">
                <Button variant="outline" size="sm">Ver todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : todayTasks.length > 0 ? (
              <div className="space-y-4">
                {todayTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${task.priority === "high" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                        <CalendarClock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{task.contactName || "Sem paciente"}</span>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{task.status}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => sendReminder(task)} title="Enviar lembrete">
                      <Send className="w-4 h-4 text-primary" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Check className="w-10 h-10 text-green-500 mb-2 opacity-20" />
                <p className="text-muted-foreground">Nenhum agendamento para hoje.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Status dos Pacientes</CardTitle>
            <p className="text-sm text-muted-foreground">Distribuição por estágio.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              {contactsByStatusLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-40 w-40 rounded-full" />
                </div>
              ) : contactsByStatus && contactsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contactsByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {contactsByStatus.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados para exibir.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <p className="text-sm text-muted-foreground">Últimas ações no sistema.</p>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm pb-4 border-b last:border-0">
                    <div className="mt-0.5">{activityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <p className="text-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(activity.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">Nenhuma atividade recente.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Orçamentos Pendentes</CardTitle>
            <p className="text-sm text-muted-foreground">Aguardando aprovação.</p>
          </CardHeader>
          <CardContent>
            {quotesLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : pendingQuotes.length > 0 ? (
              <div className="space-y-3">
                {pendingQuotes.map((quote: any) => (
                  <div key={quote.id} className="p-3 rounded-lg border bg-card text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">{quote.title}</p>
                      <Badge variant={quote.status === "sent" ? "secondary" : "outline"}>
                        {quote.status === "sent" ? "Enviado" : "Rascunho"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{quote.contactName}</span>
                      <span>Vence em {format(parseISO(quote.validUntil), "dd/MM/yyyy")}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <X className="w-8 h-8 mb-2 opacity-20" />
                <p>Nenhum orçamento pendente.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
