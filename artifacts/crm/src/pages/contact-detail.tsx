import { useState, useEffect } from "react";
import {
  useGetContact,
  getGetContactQueryKey,
  useDeleteContact,
  useUpdateContact,
  useListTasks,
  getListTasksQueryKey,
  useGetRecentActivity,
  useListCompanies,
} from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Trash2,
  Edit,
  CheckCircle2,
  Circle,
  Clock,
  CalendarClock,
  FileText,
  Stethoscope,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Copy,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { format, isBefore, parseISO, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { PatientTimeline } from "@/components/patient-timeline";
import { DocumentsTab } from "@/components/documents-tab";
import { ClinicalRecordTab } from "@/components/clinical-record-tab";
import { QuotesTab } from "@/components/quotes-tab";

export default function ContactDetail() {
  const [, params] = useRoute("/contacts/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { accessToken } = useAuth();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [recallDate, setRecallDate] = useState("");
  const [timelineItems, setTimelineItems] = useState<any[]>([]);
  const [finances, setFinances] = useState<any>(null);
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const { data: companies } = useListCompanies();

  const { data: contact, isLoading } = useGetContact(id, {
    query: {
      enabled: !!id,
      queryKey: getGetContactQueryKey(id),
    },
  });

  const { data: tasks, isLoading: tasksLoading } = useListTasks(
    { contactId: id },
    {
      query: {
        enabled: !!id,
        queryKey: getListTasksQueryKey({ contactId: id }),
      },
    },
  );

  const { data: activities, isLoading: activitiesLoading } =
    useGetRecentActivity();
  const contactActivities =
    activities?.filter(
      (a) =>
        a.entityId === id &&
        (a.type === "contact_created" || a.type === "contact_updated"),
    ) || [];

  useEffect(() => {
    if (!contact?.recallDate) return;
    setRecallDate(contact.recallDate);
  }, [contact?.recallDate]);

  useEffect(() => {
    if (!accessToken || !id) return;
    fetch(`/api/contacts/${id}/timeline`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const items: any[] = [];
        (data.activities || []).forEach((a: any) => {
          items.push({
            type: "activity",
            id: a.id,
            title: a.description,
            date: a.createdAt,
          });
        });
        (data.tasks || []).forEach((t: any) => {
          items.push({
            type: "task",
            id: t.id,
            title: t.title,
            description:
              t.status === "done"
                ? "Concluído"
                : t.dueDate
                  ? `Para ${format(parseISO(t.dueDate), "d/MM")}`
                  : "",
            date: t.createdAt,
          });
        });
        items.sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setTimelineItems(items);
      })
      .catch(() => {});
  }, [id, accessToken]);

  useEffect(() => {
    if (!accessToken || !id) return;
    fetch(`/api/contacts/${id}/finances`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then(setFinances)
      .catch(() => {});
  }, [id, accessToken]);

  useEffect(() => {
    if (!accessToken || !id) return;
    fetch(`/api/contacts/${id}/portal-token`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPortalToken(d?.patientToken || null))
      .catch(() => {});
  }, [id, accessToken]);

  useEffect(() => {
    if (!accessToken || !id) return;
    fetch(`/api/notifications?contactId=${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then(setNotifications)
      .catch(() => {});
  }, [id, accessToken]);

  const portalUrl = portalToken
    ? `${window.location.origin}/paciente/${portalToken}`
    : null;

  const copyPortalLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteMutation = useDeleteContact();
  const updateMutation = useUpdateContact();

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este paciente?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Paciente excluído" });
            queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
            setLocation("/contacts");
          },
        },
      );
    }
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const companyId = formData.get("companyId") as string;
    const data: Record<string, any> = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      role: formData.get("role") as string,
      status: formData.get("status") as any,
      notes: formData.get("notes") as string,
      companyId: companyId ? Number(companyId) : null,
      recallDate: recallDate || null,
    };

    updateMutation.mutate({ id, data } as any, {
      onSuccess: () => {
        toast({ title: "Paciente atualizado" });
        queryClient.invalidateQueries({ queryKey: getGetContactQueryKey(id) });
        setIsEditDialogOpen(false);
      },
    });
  };

  const handleSetRecall6Months = () => {
    const d = addMonths(new Date(), 6);
    setRecallDate(format(d, "yyyy-MM-dd"));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive bg-destructive/10";
      case "medium":
        return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30";
      case "low":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
      default:
        return "text-muted-foreground bg-secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Paciente não encontrado.
      </div>
    );
  }

  const isRecallOverdue =
    contact.recallDate && isBefore(parseISO(contact.recallDate), new Date());

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <Link
        href="/contacts"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Pacientes
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {contact.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{contact.status}</Badge>
            <span className="text-sm text-muted-foreground">
              Cadastrado em{" "}
              {format(new Date(contact.createdAt), "d 'de' MMM 'de' yyyy", {
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/treatment-plans?contactId=${contact.id}`}>
            <Button variant="outline" className="gap-2" size="sm">
              <FileText className="h-4 w-4" /> Planos
            </Button>
          </Link>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" /> Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar Paciente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Maria da Silva"
                    defaultValue={contact.name}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="paciente@email.com"
                      defaultValue={contact.email || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="Ex: (11) 99999-8888"
                      defaultValue={contact.phone || ""}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Profissão</Label>
                    <Input
                      id="role"
                      name="role"
                      placeholder="Ex: Advogado, Professor, Autônomo"
                      defaultValue={contact.role || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={contact.status}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Potencial — primeiro contato</SelectItem>
                        <SelectItem value="prospect">Agendado — consulta marcada</SelectItem>
                        <SelectItem value="client">Ativo — paciente em tratamento</SelectItem>
                        <SelectItem value="churned">Inativo — sem retorno</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Classifique o estágio do paciente.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyId">Clínica</Label>
                  <Select
                    name="companyId"
                    defaultValue={
                      contact.companyId ? String(contact.companyId) : ""
                    }
                  >
                    <SelectTrigger id="companyId">
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Clínica à qual o paciente está vinculado.</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recallDate">Data de Retorno (Recall)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6"
                      onClick={handleSetRecall6Months}
                    >
                      6 meses
                    </Button>
                  </div>
                  <Input
                    id="recallDate"
                    type="date"
                    value={recallDate}
                    onChange={(e) => setRecallDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Data sugerida para retorno do paciente ao consultório.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Alergias, contraindicações, preferências..."
                    defaultValue={contact.notes || ""}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending
                      ? "Salvando..."
                      : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="destructive"
            className="gap-2"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contact.email || "Sem email"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contact.phone || "Sem telefone"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{contact.role || "Sem cargo"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{contact.companyName || "Sem clínica"}</span>
              </div>
              {contact.recallDate && (
                <div className="flex items-center gap-3 text-sm pt-3 border-t">
                  <CalendarClock
                    className={`h-4 w-4 ${isRecallOverdue ? "text-destructive" : "text-muted-foreground"}`}
                  />
                  <span
                    className={
                      isRecallOverdue ? "text-destructive font-medium" : ""
                    }
                  >
                    Recall: {format(parseISO(contact.recallDate), "dd/MM/yyyy")}
                    {isRecallOverdue && " (Vencido!)"}
                  </span>
                </div>
              )}
              {contact.notes && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2 text-sm">Observações</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {contact.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <DocumentsTab entityType="contact" entityId={id} />

          <ClinicalRecordTab contactId={id} />

          <QuotesTab contactId={id} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : tasks?.length ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${task.status === "done" ? "bg-muted/30 opacity-70" : "bg-card"}`}
                    >
                      {task.status === "done" ? (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
                          >
                            {task.title}
                          </p>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] uppercase px-1.5 py-0.5 ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(task.dueDate), "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum agendamento vinculado
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Planos de Tratamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/treatment-plans?contactId=${contact.id}`}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <FileText className="h-4 w-4" /> Ver Planos
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              {finances ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Saldo</span>
                    <span
                      className={`font-semibold ${finances.balance >= 0 ? "text-green-600" : "text-destructive"}`}
                    >
                      R$ {finances.balance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total Recebido
                    </span>
                    <span className="font-semibold text-green-600">
                      R$ {finances.totalIncome.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Gasto</span>
                    <span className="font-semibold text-destructive">
                      R$ {finances.totalExpense.toFixed(2)}
                    </span>
                  </div>
                  {finances.pendingIncome > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">A Receber</span>
                      <Badge variant="secondary">
                        R$ {finances.pendingIncome.toFixed(2)}
                      </Badge>
                    </div>
                  )}
                  <Link href="/financial">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 mt-1"
                    >
                      <DollarSign className="h-4 w-4" /> Ver Transações
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Recall
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.recallDate ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    Próximo retorno:{" "}
                    <strong>
                      {format(parseISO(contact.recallDate), "dd/MM/yyyy")}
                    </strong>
                  </p>
                  {isRecallOverdue && (
                    <Badge variant="destructive">Vencido</Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum recall configurado.
                </p>
              )}
            </CardContent>
          </Card>

          {portalUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  Portal do Paciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Compartilhe este link com o paciente:
                  </p>
                  <div className="flex items-center gap-2">
                    <Input value={portalUrl} readOnly className="text-xs" />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={copyPortalLink}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-600">Link copiado!</p>
                  )}
                  <Link href={`/paciente/${portalToken}`}>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <ExternalLink className="h-4 w-4" /> Abrir Portal
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-2 text-sm border-b last:border-0 pb-2 last:pb-0"
                    >
                      <Bell className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{n.message}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {n.channel === "simulado" ? "Simulado" : n.channel}
                          </span>
                          <span>•</span>
                          <span>
                            {format(new Date(n.createdAt), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhuma notificação enviada.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Linha do Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <PatientTimeline items={timelineItems} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
