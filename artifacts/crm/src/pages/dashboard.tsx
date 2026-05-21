import { useGetDashboardStats, useGetRecentActivity, useGetUpcomingTasks, useGetContactsByStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, CheckSquare, AlertCircle, Activity, CalendarClock, UserPlus, TrendingUp, TrendingDown, Bell, FileText, Send, Check, X } from "lucide-react";
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
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useGetRecentActivity();
  const { data: tasks, isLoading: tasksLoading } = useGetUpcomingTasks();
  const { data: contactsByStatus, isLoading: contactsByStatusLoading } = useGetContactsByStatus();

  const [pendingQuotes, setPendingQuotes] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContacts}</div>
                <p className="text-xs text-muted-foreground">+{stats.newContactsThisMonth} este mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clínicas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos Abertos</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks - stats.tasksDone}</div>
                <p className="text-xs text-muted-foreground">{stats.tasksDueToday} para hoje</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Em Atraso</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.tasksOverdue}</div>
                <p className="text-xs text-destructive/80">Requer atenção</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-5 w-5 text-primary" />
              Agendamentos de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : todayTasks.length > 0 ? (
              <div className="space-y-3">
                {todayTasks.map(task => (
                  <div key={task.id} className="flex items-start justify-between gap-2 border-b last:border-0 pb-3 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.contactName || task.companyName || "Sem vínculo"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => sendReminder(task)} title="Enviar lembrete" className="text-muted-foreground hover:text-primary transition-colors">
                        <Bell className="h-4 w-4" />
                      </button>
                      <Badge variant="secondary" className={`text-[10px] uppercase ${task.priority === 'high' ? 'bg-destructive/10 text-destructive' : task.priority === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum agendamento para hoje.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              Orçamentos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quotesLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : pendingQuotes.length > 0 ? (
              <div className="space-y-3">
                {pendingQuotes.slice(0, 5).map((q) => (
                  <div key={q.id} className="flex items-start justify-between gap-2 border-b last:border-0 pb-3 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{q.title}</p>
                      <p className="text-xs text-muted-foreground">{q.contactName || "Sem paciente"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {q.status === "draft" && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Enviar" onClick={() => {
                          fetch(`/api/quotes/${q.id}/status`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                            body: JSON.stringify({ status: "sent" }),
                          }).then(() => {
                            setPendingQuotes(prev => prev.filter(p => p.id !== q.id));
                            toast({ title: "Orçamento enviado" });
                          });
                        }}>
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {q.status === "sent" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" title="Aceito" onClick={() => {
                            fetch(`/api/quotes/${q.id}/status`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                              body: JSON.stringify({ status: "accepted" }),
                            }).then(() => {
                              setPendingQuotes(prev => prev.filter(p => p.id !== q.id));
                              toast({ title: "Orçamento aceito" });
                            });
                          }}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Recusado" onClick={() => {
                            fetch(`/api/quotes/${q.id}/status`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                              body: JSON.stringify({ status: "rejected" }),
                            }).then(() => {
                              setPendingQuotes(prev => prev.filter(p => p.id !== q.id));
                              toast({ title: "Orçamento recusado" });
                            });
                          }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Badge variant="secondary" className="text-[10px]">{q.status === "draft" ? "Rascunho" : "Enviado"}</Badge>
                    </div>
                  </div>
                ))}
                {pendingQuotes.length > 5 && (
                  <Link href="/quotes">
                    <Button variant="ghost" size="sm" className="w-full text-xs">Ver todos ({pendingQuotes.length})</Button>
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum orçamento pendente.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pacientes por Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {contactsByStatusLoading ? (
              <Skeleton className="h-full w-full" />
            ) : contactsByStatus?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contactsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                  >
                    {contactsByStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value, name === "lead" ? "Potencial" : name === "prospect" ? "Agendado" : name === "client" ? "Ativo" : name === "churned" ? "Inativo" : String(name).charAt(0).toUpperCase() + String(name).slice(1)]} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend formatter={(value) => value === "lead" ? "Potencial" : value === "prospect" ? "Agendado" : value === "client" ? "Ativo" : value === "churned" ? "Inativo" : value.charAt(0).toUpperCase() + value.slice(1)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados disponíveis</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visão Geral de Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {statsLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {taskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Financeiro do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : stats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Receitas</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">R$ {Number(stats.monthIncome || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">Despesas</span>
                  </div>
                  <span className="text-lg font-bold text-destructive">R$ {Number(stats.monthExpense || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <span className="text-sm font-medium">Saldo do Mês</span>
                  <span className={`text-lg font-bold ${Number(stats.monthIncome || 0) - Number(stats.monthExpense || 0) >= 0 ? "text-green-600" : "text-destructive"}`}>
                    R$ {(Number(stats.monthIncome || 0) - Number(stats.monthExpense || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados financeiros</p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : tasks?.length ? (
              <div className="space-y-4">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-start justify-between border-b last:border-0 pb-4 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {                  task.contactName || task.companyName || "Sem vínculo"}
                      </p>
                    </div>
                    {task.dueDate && (
                      <div className="text-xs font-medium px-2 py-1 bg-secondary rounded-md">
                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum agendamento futuro.</p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activities?.length ? (
              <div className="space-y-6">
                {activities.map(activity => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma atividade recente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
