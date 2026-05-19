import { useListTasks, useCompleteTask, getListTasksQueryKey, useDeleteTask, useCreateTask, useListContacts, useListCompanies } from "@workspace/api-client-react";
import { Plus, Search, CheckCircle2, Circle, Clock, AlertCircle, Trash2, Download, X, List, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isSameDay, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AppointmentCalendar } from "@/components/appointment-calendar";

export default function Tasks() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data: tasks, isLoading } = useListTasks();
  const { data: contacts } = useListContacts();
  const { data: companies } = useListCompanies();
  const completeMutation = useCompleteTask();
  const deleteMutation = useDeleteTask();
  const createMutation = useCreateTask();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(t => {
      if (debouncedSearch && !t.title.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterDate && t.dueDate) {
        if (!isSameDay(parseISO(t.dueDate), parseISO(filterDate))) return false;
      }
      return true;
    });
  }, [tasks, debouncedSearch, filterStatus, filterPriority, filterDate]);

  const [form, setForm] = useState({ title: "", description: "", status: "pending", priority: "medium", dueDate: "", contactId: "", companyId: "" });

  function handleExport() {
    if (!accessToken) return;
    fetch("/api/tasks/export", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "agendamentos.csv"; a.click();
        URL.revokeObjectURL(url);
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    createMutation.mutate(
      { data: { title: form.title, description: form.description || undefined, status: form.status as any, priority: form.priority as any, dueDate: form.dueDate || undefined, contactId: form.contactId ? Number(form.contactId) : null, companyId: form.companyId ? Number(form.companyId) : null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
          toast({ title: "Agendamento criado" });
          setOpen(false);
          setForm({ title: "", description: "", status: "pending", priority: "medium", dueDate: "", contactId: "", companyId: "" });
        },
      }
    );
  }

  const [, navigate] = useLocation();

  const handleToggle = (id: number) => {
    completeMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        toast({
          title: "Consulta concluída",
          description: "Criar uma receita no Financeiro?",
          action: <Button variant="outline" size="sm" onClick={() => navigate("/financial")}>Ir para Financeiro</Button>,
        });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Excluir este agendamento?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        }
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  function handleSelectCalendarDate(date: Date) {
    setFilterDate(format(date, "yyyy-MM-dd"));
    setView("list");
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Agendamentos</h1>
          <p className="text-muted-foreground mt-1">Gerencie consultas e compromissos.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-task">
                <Plus className="h-4 w-4" />
                Adicionar Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Agendamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Título *</label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="done">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridade</label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Data</label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Paciente</label>
                    <Select value={form.contactId} onValueChange={v => setForm({ ...form, contactId: v })}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        {contacts?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Clínica</label>
                    <Select value={form.companyId} onValueChange={v => setForm({ ...form, companyId: v })}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        {companies?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Salvando..." : "Salvar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 bg-card border rounded-lg p-1">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${view === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-4 w-4" />
            Lista
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${view === "calendar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <CalendarDays className="h-4 w-4" />
            Calendário
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-50 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar agendamentos..." className="pl-9 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <X className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setSearch("")} />}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32.5 bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="done">Concluído</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32.5 bg-card">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-card w-37.5" />
          </div>
          {(filterStatus !== "all" || filterPriority !== "all" || filterDate || debouncedSearch) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterDate(""); setSearch(""); }}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      {view === "calendar" ? (
        <Card className="overflow-hidden border shadow-sm p-4">
          <AppointmentCalendar appointments={tasks || []} onSelectDate={handleSelectCalendarDate} />
        </Card>
      ) : (
        <Card className="overflow-hidden border shadow-sm">
          <div className="divide-y">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                Nenhum agendamento encontrado.
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div key={task.id} className={`p-4 flex items-start gap-4 transition-colors hover:bg-muted/30 group ${task.status === 'done' ? 'opacity-60' : ''}`}>
                  <button 
                    onClick={() => handleToggle(task.id)}
                    className="mt-1 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {task.status === 'done' ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${task.status === 'done' ? 'line-through' : ''}`}>
                        {task.title}
                      </p>
                      <Badge variant="secondary" className={`text-[10px] uppercase px-1.5 py-0.5 ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {task.companyName && <span>{task.companyName}</span>}
                      {task.contactName && <span>• {task.contactName}</span>}
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
