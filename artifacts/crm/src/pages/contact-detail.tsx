import { useState } from "react";
import { useGetContact, getGetContactQueryKey, useDeleteContact, useUpdateContact, useListTasks, getListTasksQueryKey, useGetRecentActivity, useListCompanies } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Building2, Mail, Phone, Briefcase, Trash2, Edit, CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ContactDetail() {
  const [, params] = useRoute("/contacts/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: companies } = useListCompanies();

  const { data: contact, isLoading } = useGetContact(id, {
    query: {
      enabled: !!id,
      queryKey: getGetContactQueryKey(id)
    }
  });

  const { data: tasks, isLoading: tasksLoading } = useListTasks(
    { contactId: id }, 
    { query: { enabled: !!id, queryKey: getListTasksQueryKey({ contactId: id }) } }
  );

  const { data: activities, isLoading: activitiesLoading } = useGetRecentActivity();
  const contactActivities = activities?.filter(a => a.entityId === id && (a.type === 'contact_created' || a.type === 'contact_updated')) || [];

  const deleteMutation = useDeleteContact();
  const updateMutation = useUpdateContact();

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este paciente?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Paciente excluído" });
          queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
          setLocation("/contacts");
        }
      });
    }
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const companyId = formData.get("companyId") as string;
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      role: formData.get("role") as string,
      status: formData.get("status") as any,
      notes: formData.get("notes") as string,
      companyId: companyId ? Number(companyId) : null,
    };
    
    updateMutation.mutate({ id, data }, {
      onSuccess: () => {
        toast({ title: "Paciente atualizado" });
        queryClient.invalidateQueries({ queryKey: getGetContactQueryKey(id) });
        setIsEditDialogOpen(false);
      }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!contact) {
    return     <div className="text-center py-12 text-muted-foreground">Paciente não encontrado.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <Link href="/contacts" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Pacientes
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{contact.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{contact.status}</Badge>
            <span className="text-sm text-muted-foreground">
              Added {format(new Date(contact.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Paciente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" defaultValue={contact.name} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={contact.email || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={contact.phone || ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" name="role" defaultValue={contact.role || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={contact.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Potencial</SelectItem>
                        <SelectItem value="prospect">Agendado</SelectItem>
                        <SelectItem value="client">Ativo</SelectItem>
                        <SelectItem value="churned">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyId">Clínica</Label>
                  <Select name="companyId" defaultValue={contact.companyId ? String(contact.companyId) : ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" name="notes" defaultValue={contact.notes || ""} rows={4} />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" className="gap-2" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
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

              {contact.notes && (
                <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-2 text-sm">Observações</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarefas vinculadas</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : tasks?.length ? (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border ${task.status === 'done' ? 'bg-muted/30 opacity-70' : 'bg-card'}`}>
                      {task.status === 'done' ? (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          <Badge variant="secondary" className={`text-[10px] uppercase px-1.5 py-0.5 ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tarefa vinculada</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : contactActivities.length > 0 ? (
                <div className="space-y-6">
                  {contactActivities.map((activity, index) => (
                    <div key={activity.id} className="relative pl-6">
                      {index !== contactActivities.length - 1 && (
                        <div className="absolute left-2.5 top-5 bottom-[-24px] w-px bg-border" />
                      )}
                      <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum histórico disponível</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
