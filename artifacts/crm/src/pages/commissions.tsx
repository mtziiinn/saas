import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, CheckCircle2, Clock, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  useEffect(() => {
    fetchCommissions();
  }, [accessToken, statusFilter, professionalFilter]);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/users", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [accessToken]);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Comissões</h1>
        <p className="text-muted-foreground mt-1">Gerencie as comissões dos profissionais por procedimento.</p>
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
