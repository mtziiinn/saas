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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, FileText, DollarSign, Percent, CalendarCheck, UserPlus, UserMinus, ShoppingCart, Send, Check, X, Filter, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";

const typeIcons: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  treatment_plan_created: { icon: FileText, color: "text-blue-600 bg-blue-50 dark:bg-blue-950", label: "Plano" },
  transaction_created: { icon: DollarSign, color: "text-green-600 bg-green-50 dark:bg-green-950", label: "Financeiro" },
  commission_paid: { icon: Percent, color: "text-amber-600 bg-amber-50 dark:bg-amber-950", label: "Comissão" },
  commission_percentage_updated: { icon: Percent, color: "text-purple-600 bg-purple-50 dark:bg-purple-950", label: "Comissão" },
  user_created: { icon: UserPlus, color: "text-teal-600 bg-teal-50 dark:bg-teal-950", label: "Usuário" },
  user_updated: { icon: UserMinus, color: "text-orange-600 bg-orange-50 dark:bg-orange-950", label: "Usuário" },
};

function getTypeConfig(type: string) {
  return typeIcons[type] || { icon: Activity, color: "text-gray-600 bg-gray-50 dark:bg-gray-950", label: type };
}

interface ActivityItem {
  id: number;
  type: string;
  description: string;
  entityId: number | null;
  entityName: string | null;
  createdAt: string;
}

interface PaginatedResult {
  items: ActivityItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ActivityLog() {
  const { accessToken } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<PaginatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  function fetchLog() {
    if (!accessToken) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (typeFilter !== "all") params.set("type", typeFilter);

    fetch(`/api/activity-log?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(setData)
      .catch(() => toast({ title: "Erro ao carregar atividades" }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchLog();
  }, [accessToken, typeFilter, page]);

  useEffect(() => { setPage(1); }, [typeFilter]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Histórico de Atividades</h1>
        <p className="text-muted-foreground mt-1">Todas as ações registradas no sistema.</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="treatment_plan_created">Planos de Tratamento</SelectItem>
              <SelectItem value="transaction_created">Transações Financeiras</SelectItem>
              <SelectItem value="commission_paid">Comissões Pagas</SelectItem>
              <SelectItem value="commission_percentage_updated">% Comissão Alterada</SelectItem>
              <SelectItem value="user_created">Usuários Criados</SelectItem>
              <SelectItem value="user_updated">Usuários Alterados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data && (
          <p className="text-sm text-muted-foreground">{data.total} registro(s)</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : data && data.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
          <Activity className="h-10 w-10 mx-auto mb-4 opacity-50" />
          Nenhuma atividade encontrada.
        </div>
      ) : data ? (
        <div className="space-y-2">
          {data.items.map((item) => {
            const cfg = getTypeConfig(item.type);
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="flex gap-3 items-start p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                <div className={`shrink-0 p-2 rounded-md ${cfg.color} h-fit`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{item.description}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{cfg.label}</Badge>
                    {item.entityName && (
                      <span className="text-xs text-muted-foreground truncate">{item.entityName}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
