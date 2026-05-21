import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, CheckCircle2, Clock, Filter, Search, Settings, Users, Percent, Save } from "lucide-react";

interface Commission {
  id: number;
  procedureId: number;
  professionalId: number;
  professionalName: string | null;
  treatmentPlanId: number;
  procedureValue: string;
  commissionPercentage: string;
  commissionAmount: string;
  status: string;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface Summary {
  totalPending: number;
  totalPaid: number;
  pendingCount: number;
  monthPending: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  commissionPercentage: string;
}

export default function Commissions() {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [professionalFilter, setProfessionalFilter] = useState("all");
  const [users, setUsers] = useState<User[]>([]);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [editingPct, setEditingPct] = useState<Record<number, string>>({});

  function fetchCommissions() {
    if (!accessToken) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (professionalFilter !== "all") params.set("professionalId", professionalFilter);

    Promise.all([
      fetch(`/api/commissions?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json()),
      fetch("/api/commissions/summary", { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json()),
    ])
      .then(([commissionsData, summaryData]) => {
        setCommissions(Array.isArray(commissionsData) ? commissionsData : []);
        setSummary(summaryData);
      })
      .catch(() => toast({ title: "Erro ao carregar comissões" }))
      .finally(() => setLoading(false));
  }

  function fetchUsers() {
    if (!accessToken) return;
    fetch("/api/users", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setUsers(list);
        const pct: Record<number, string> = {};
        list.forEach((u: User) => { pct[u.id] = u.commissionPercentage; });
        setEditingPct(pct);
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchCommissions();
  }, [accessToken, statusFilter, professionalFilter]);

  useEffect(() => {
    fetchUsers();
  }, [accessToken]);

  useEffect(() => {
    if (usersDialogOpen) fetchUsers();
  }, [usersDialogOpen]);

  async function handlePay(id: number) {
    try {
      const res = await fetch(`/api/commissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Comissão marcada como paga" });
      fetchCommissions();
    } catch {
      toast({ title: "Erro ao pagar comissão", variant: "destructive" });
    }
  }

  async function handleSavePercentage(userId: number) {
    const pct = editingPct[userId];
    if (pct === undefined) return;
    const num = Number(pct);
    if (isNaN(num) || num < 0 || num > 100) {
      toast({ title: "Percentual inválido", description: "Deve ser entre 0 e 100", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ commissionPercentage: num }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Percentual atualizado" });
      fetchUsers();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Comissões</h1>
          <p className="text-muted-foreground mt-1">Gerencie as comissões dos profissionais por procedimento.</p>
        </div>
        <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" /> Configurar Profissionais
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Comissão dos Profissionais</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">
                Defina a porcentagem de comissão para cada profissional. O valor é aplicado automaticamente ao valor do procedimento quando concluído.
              </p>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum profissional cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email} — {u.role}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative w-20">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={editingPct[u.id] ?? u.commissionPercentage}
                            onChange={e => setEditingPct(p => ({ ...p, [u.id]: e.target.value }))}
                            className="h-8 pr-6 text-sm text-right"
                          />
                          <Percent className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleSavePercentage(u.id)}
                          title="Salvar"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading && !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">R$ {summary.totalPending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{summary.pendingCount} comissão(ões)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">R$ {summary.totalPaid.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendente no Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">R$ {summary.monthPending.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {(summary.totalPending + summary.totalPaid).toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todos os profissionais" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : commissions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
          <DollarSign className="h-10 w-10 mx-auto mb-4 opacity-50" />
          Nenhuma comissão encontrada.
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Profissional</th>
                <th className="px-4 py-3 font-medium">Valor Proc.</th>
                <th className="px-4 py-3 font-medium">%</th>
                <th className="px-4 py-3 font-medium">Comissão</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {commissions.map(c => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.professionalName || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">R$ {Number(c.procedureValue).toFixed(2)}</td>
                  <td className="px-4 py-3">{c.commissionPercentage}%</td>
                  <td className="px-4 py-3 font-semibold">R$ {Number(c.commissionAmount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {c.status === "paid" ? (
                      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50"><CheckCircle2 className="h-3 w-3 mr-1" />Pago</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-amber-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.paidAt
                      ? format(new Date(c.paidAt), "dd/MM/yyyy", { locale: ptBR })
                      : format(new Date(c.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "pending" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handlePay(c.id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Pagar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
