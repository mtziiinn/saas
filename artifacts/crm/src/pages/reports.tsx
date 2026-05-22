import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, FileSpreadsheet, TrendingUp, TrendingDown, Wallet, DollarSign, Calendar, FileText, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

interface FinSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

interface CommSummary {
  totalPending: number;
  totalPaid: number;
  pendingCount: number;
}

interface ChartData {
  month: string;
  income: number;
  expense: number;
}

const monthNames: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

export default function Reports() {
  const { accessToken } = useAuth();
  const { toast } = useToast();

  const today = format(new Date(), "yyyy-MM-dd");
  const firstOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [finType, setFinType] = useState("all");
  const [finStatus, setFinStatus] = useState("all");
  const [commStatus, setCommStatus] = useState("all");
  const [commProfessional, setCommProfessional] = useState("all");

  const [finSummary, setFinSummary] = useState<FinSummary | null>(null);
  const [commSummary, setCommSummary] = useState<CommSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchData() {
    if (!accessToken) return;
    setLoading(true);

    const finParams = new URLSearchParams({ startDate, endDate });
    if (finType !== "all") finParams.set("type", finType);
    if (finStatus !== "all") finParams.set("status", finStatus);

    const commParams = new URLSearchParams({ startDate, endDate });
    if (commStatus !== "all") commParams.set("status", commStatus);
    if (commProfessional !== "all") commParams.set("professionalId", commProfessional);

    Promise.all([
      fetch(`/api/financial-transactions/summary?${finParams}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.json()),
      fetch(`/api/commissions/summary?${commParams}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.json()),
      fetch(`/api/reports/financial-chart?${finParams}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.json()),
    ])
      .then(([fin, comm, chart]) => {
        setFinSummary(fin);
        setCommSummary(comm);
        setChartData(Array.isArray(chart) ? chart : []);
      })
      .catch(() => toast({ title: "Erro ao carregar relatórios" }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, [accessToken, startDate, endDate, finType, finStatus, commStatus, commProfessional]);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/users", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [accessToken]);

  function handleExport(url: string, filename: string) {
    if (!accessToken) return;
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast({ title: "Erro ao exportar", variant: "destructive" }));
  }

  function finParams() {
    const p = new URLSearchParams({ startDate, endDate });
    if (finType !== "all") p.set("type", finType);
    if (finStatus !== "all") p.set("status", finStatus);
    return p.toString();
  }

  function commParams() {
    const p = new URLSearchParams({ startDate, endDate });
    if (commStatus !== "all") p.set("status", commStatus);
    if (commProfessional !== "all") p.set("professionalId", commProfessional);
    return p.toString();
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Visualize e exporte relatórios financeiros e de comissões.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Data inicial</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-1">
              <Label>Data final</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-44" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setStartDate(firstOfMonth); setEndDate(today); }}>
              Este mês
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setStartDate(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
              setEndDate(today);
            }}>
              Este ano
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Financeiro
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport(`/api/financial/export?${finParams()}`, `financeiro-${startDate}-${endDate}.csv`)}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport(`/api/reports/financial-pdf?${finParams()}`, `relatorio-financeiro-${startDate}-${endDate}.pdf`)}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={finType} onValueChange={setFinType}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={finStatus} onValueChange={setFinStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && !finSummary ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : finSummary ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-emerald-200 bg-emerald-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      Receitas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">R$ {finSummary.totalIncome.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      Despesas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">R$ {finSummary.totalExpense.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className={finSummary.balance >= 0 ? "border-sky-200 bg-sky-50/30" : "border-red-200 bg-red-50/30"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      Saldo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${finSummary.balance >= 0 ? "text-sky-600" : "text-red-600"}`}>
                      R$ {finSummary.balance.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {chartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      Receitas vs Despesas por Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.map(d => ({ ...d, month: monthNames[d.month.slice(5)] || d.month }))}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${v}`} />
                          <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                          <Legend />
                          <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-amber-500" />
            Comissões
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport(`/api/commissions/export?${commParams()}`, `comissoes-${startDate}-${endDate}.csv`)}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport(`/api/reports/commissions-pdf?${commParams()}`, `relatorio-comissoes-${startDate}-${endDate}.pdf`)}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={commStatus} onValueChange={setCommStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Profissional</Label>
              <Select value={commProfessional} onValueChange={setCommProfessional}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && !commSummary ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : commSummary ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">R$ {commSummary.totalPending.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{commSummary.pendingCount} comissão(ões)</p>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">R$ {commSummary.totalPaid.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {(commSummary.totalPending + commSummary.totalPaid).toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
