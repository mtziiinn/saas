import { useState, useEffect } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { Plus, ArrowLeft, Edit, Trash2, FileText, DollarSign, Circle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface Procedure {
  id?: number;
  procedureName: string;
  toothNumber?: number | null;
  region?: string;
  value: string;
  status?: string;
  notes?: string;
}

interface TreatmentPlan {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  totalValue: string;
  contactId: number;
  contactName?: string | null;
  createdAt: string;
  procedures: Procedure[];
}

export default function TreatmentPlans() {
  const [, params] = useRoute("/treatment-plans/:id");
  const planId = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<{ id: number; name: string }[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    contactId: "",
    procedures: [] as Procedure[],
  });

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    const url = planId ? `/api/treatment-plans/${planId}` : "/api/treatment-plans";
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(data => {
        if (planId) setPlan(data);
        else setPlans(Array.isArray(data) ? data : []);
      })
      .catch(() => toast({ title: "Erro ao carregar" }))
      .finally(() => setLoading(false));
  }, [planId, accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/contacts", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(data => setContacts(Array.isArray(data) ? data.map((c: { id: number; name: string }) => ({ id: c.id, name: c.name })) : []))
      .catch(() => {});
  }, [accessToken]);

  const addProcedure = () => {
    setForm(f => ({ ...f, procedures: [...f.procedures, { procedureName: "", value: "0" }] }));
  };

  const updateProcedure = (index: number, field: keyof Procedure, value: string | number | null | undefined) => {
    setForm(f => {
      const procs = [...f.procedures];
      procs[index] = { ...procs[index], [field]: value };
      return { ...f, procedures: procs };
    });
  };

  const removeProcedure = (index: number) => {
    setForm(f => ({ ...f, procedures: f.procedures.filter((_, i) => i !== index) }));
  };

  const totalFormValue = form.procedures.reduce((sum, p) => sum + Number(p.value || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.contactId) {
      toast({ title: "Erro", description: "Título e paciente são obrigatórios" });
      return;
    }

    try {
      const res = await fetch("/api/treatment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          contactId: Number(form.contactId),
          procedures: form.procedures.filter(p => p.procedureName.trim()),
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast({ title: "Plano de tratamento criado" });
      setOpen(false);
      setForm({ title: "", description: "", contactId: "", procedures: [] });
      const data = await fetch("/api/treatment-plans", { headers: { Authorization: `Bearer ${accessToken}` } });
      setPlans(await data.json());
    } catch {
      toast({ title: "Erro ao criar plano" });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este plano de tratamento?")) return;
    try {
      await fetch(`/api/treatment-plans/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast({ title: "Plano excluído" });
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch {
      toast({ title: "Erro ao excluir" });
    }
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    active: "Ativo",
    completed: "Concluído",
    cancelled: "Cancelado",
  };

  if (planId && plan) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <Link href="/treatment-plans" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Planos
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{plan.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className={statusColors[plan.status] || ""}>{statusLabels[plan.status] || plan.status}</Badge>
              {plan.contactName && <span className="text-sm text-muted-foreground">Paciente: {plan.contactName}</span>}
            </div>
          </div>
          <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleDelete(plan.id)}>
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </div>

        {plan.description && (
          <Card>
            <CardHeader><CardTitle>Descrição</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.description}</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Procedimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plan.procedures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum procedimento cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Procedimento</th>
                      <th className="px-4 py-3 font-medium">Dente</th>
                      <th className="px-4 py-3 font-medium">Região</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {plan.procedures.map((p, i) => (
                      <tr key={p.id || i} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{p.procedureName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.toothNumber || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.region || "—"}</td>
                        <td className="px-4 py-3">R$ {Number(p.value).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${p.status === "done" ? "text-green-600" : "text-muted-foreground"}`}>
                            {p.status === "done" ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                            {p.status === "done" ? "Concluído" : "Pendente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 pt-4 border-t flex justify-end">
              <span className="text-lg font-semibold">Total: R$ {Number(plan.totalValue).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Planos de Tratamento</h1>
          <p className="text-muted-foreground mt-1">Gerencie procedimentos e orçamentos dos pacientes.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Plano de Tratamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select value={form.contactId} onValueChange={v => setForm({ ...form, contactId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Procedimentos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addProcedure}>+ Adicionar</Button>
                </div>
                {form.procedures.map((proc, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Procedimento #{index + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeProcedure(index)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs">Nome</Label>
                        <Input value={proc.procedureName} onChange={e => updateProcedure(index, "procedureName", e.target.value)} placeholder="Ex: Limpeza, Canal, Extração" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Dente</Label>
                        <Input type="number" value={proc.toothNumber || ""} onChange={e => updateProcedure(index, "toothNumber", e.target.value ? Number(e.target.value) : null)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Região</Label>
                        <Input value={proc.region || ""} onChange={e => updateProcedure(index, "region", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input type="number" step="0.01" value={proc.value} onChange={e => updateProcedure(index, "value", e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {form.procedures.length > 0 && (
                <div className="flex justify-end text-sm font-medium">
                  Total estimado: R$ {totalFormValue.toFixed(2)}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Criar Plano</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
          Nenhum plano de tratamento criado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(p => (
            <Link key={p.id} href={`/treatment-plans/${p.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{p.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.contactName || "Sem paciente"}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant="secondary" className={statusColors[p.status] || ""}>{statusLabels[p.status] || p.status}</Badge>
                    <span className="text-sm font-semibold text-primary">R$ {Number(p.totalValue).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
