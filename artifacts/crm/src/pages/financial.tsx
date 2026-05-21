import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Plus, ArrowLeft, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, Wallet, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: number;
  description: string;
  type: "income" | "expense";
  category: string;
  amount: string;
  date: string;
  status: "pending" | "paid" | "cancelled";
  paymentMethod: string | null;
  contactId: number | null;
  contactName: string | null;
  treatmentPlanId: number | null;
  notes: string | null;
  createdAt: string;
}

interface Summary {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  pendingIncome: number;
  monthIncome: number;
  monthExpense: number;
  monthBalance: number;
}

const categories = [
  "consulta", "procedimento", "exame", "material", "salario",
  "aluguel", "utilidades", "marketing", "imposto", "outro"
];

const typeLabels: Record<string, string> = { income: "Receita", expense: "Despesa" };
const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", cancelled: "Cancelado" };
const paymentLabels: Record<string, string> = { cash: "Dinheiro", credit_card: "Cartão Crédito", debit: "Cartão Débito", pix: "PIX", transfer: "Transferência" };

export default function Financial() {
  const [, setLocation] = useLocation();
  const { accessToken } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    description: "", type: "income", category: "consulta", amount: "",
    date: format(new Date(), "yyyy-MM-dd"), status: "pending" as string,
    paymentMethod: "", contactId: "", notes: "",
  });

  const fetchData = () => {
    if (!accessToken) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (filterType !== "all") params.set("type", filterType);
    if (filterStatus !== "all") params.set("status", filterStatus);

    Promise.all([
      fetch(`/api/financial-transactions?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json()),
      fetch("/api/financial-transactions/summary", { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json()),
    ]).then(([txData, summaryData]) => {
      setTransactions(txData);
      setSummary(summaryData);
    }).catch(() => {
      toast({ title: "Erro ao carregar dados financeiros", variant: "destructive" });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [accessToken, filterType, filterStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    const body = {
      ...form,
      amount: form.amount.replace(",", "."),
      date: new Date(form.date).toISOString(),
      contactId: form.contactId ? Number(form.contactId) : null,
      paymentMethod: form.paymentMethod || null,
    };

    const url = editingId ? `/api/financial-transactions/${editingId}` : "/api/financial-transactions";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast({ title: editingId ? "Transação atualizada" : "Transação criada" });
      setDialogOpen(false);
      setEditingId(null);
      resetForm();
      fetchData();
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleEdit = (tx: Transaction) => {
    setForm({
      description: tx.description,
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      date: format(parseISO(tx.date), "yyyy-MM-dd"),
      status: tx.status,
      paymentMethod: tx.paymentMethod || "",
      contactId: tx.contactId ? String(tx.contactId) : "",
      notes: tx.notes || "",
    });
    setEditingId(tx.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    if (!accessToken) return;

    const res = await fetch(`/api/financial-transactions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) {
      toast({ title: "Transação excluída" });
      fetchData();
    }
  };

  const resetForm = () => {
    setForm({
      description: "", type: "income", category: "consulta", amount: "",
      date: format(new Date(), "yyyy-MM-dd"), status: "pending",
      paymentMethod: "", contactId: "", notes: "",
    });
    setEditingId(null);
  };

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

  const filtered = search
    ? transactions.filter(t => t.description.toLowerCase().includes(search.toLowerCase()))
    : transactions;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Financeiro</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Transação</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Transação" : "Nova Transação"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input id="description" placeholder="Ex: Consulta de avaliação, Compra de materiais" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita — entrada de dinheiro</SelectItem>
                      <SelectItem value="expense">Despesa — saída de dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$) *</Label>
                  <Input id="amount" type="text" inputMode="decimal" placeholder="Ex: 250.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                  <p className="text-xs text-muted-foreground">Use ponto como separador decimal (Ex: 150.50).</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input id="date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente — aguardando pagamento</SelectItem>
                      <SelectItem value="paid">Pago — recebido/quitado</SelectItem>
                      <SelectItem value="cancelled">Cancelado — não será cobrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                  <Select value={form.paymentMethod} onValueChange={v => setForm({ ...form, paymentMethod: v })}>
                    <SelectTrigger id="paymentMethod"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Como o pagamento foi ou será realizado.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Informações adicionais sobre a transação..." rows={2} />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit">{editingId ? "Salvar Alterações" : "Criar Transação"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.balance >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(summary.balance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receitas (Mês)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.monthIncome)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(summary.monthExpense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.pendingIncome)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-50 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar transações..." className="pl-9 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <X className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setSearch("")} />}
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32.5 bg-card"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32.5 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search || filterType !== "all" || filterStatus !== "all" ? "Nenhuma transação encontrada" : "Nenhuma transação cadastrada"}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(tx => (
                <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {tx.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tx.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{format(parseISO(tx.date), "dd/MM/yyyy")}</span>
                      {tx.contactName && <span>• {tx.contactName}</span>}
                      <Badge variant="outline" className="text-[10px]">{tx.category}</Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${tx.type === "income" ? "text-green-600" : "text-destructive"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                    </p>
                    <Badge variant={tx.status === "paid" ? "default" : tx.status === "pending" ? "secondary" : "outline"} className="text-[10px]">
                      {statusLabels[tx.status]}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(tx)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(tx.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
