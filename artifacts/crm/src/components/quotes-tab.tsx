import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Loader2,
  Send,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Quote {
  id: number;
  contactId: number;
  authorId: number | null;
  title: string;
  status: string;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
}

interface QuoteItem {
  id: number;
  quoteId: number;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

interface QuotesTabProps {
  contactId: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  sent: { label: "Enviado", variant: "default" },
  accepted: { label: "Aceito", variant: "outline" },
  rejected: { label: "Recusado", variant: "destructive" },
  expired: { label: "Expirado", variant: "secondary" },
};

export function QuotesTab({ contactId }: QuotesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<{ description: string; quantity: number; unitPrice: number }[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const { toast } = useToast();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["quotes", contactId],
    queryFn: async () => {
      const res = await fetch(`/api/quotes?contactId=${contactId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Erro ao carregar orçamentos");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ contactId, title, validUntil: validUntil || null, notes: notes || null, items }),
      });
      if (!res.ok) throw new Error("Erro ao criar orçamento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", contactId] });
      setTitle("");
      setValidUntil("");
      setNotes("");
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setDialogOpen(false);
      toast({ title: "Orçamento criado" });
    },
    onError: () => toast({ title: "Erro ao criar orçamento", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/quotes/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", contactId] });
      toast({ title: "Status atualizado" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Erro ao deletar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", contactId] });
      toast({ title: "Orçamento excluído" });
    },
  });

  const addItem = () => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[i] as any)[field] = value;
    setItems(newItems);
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Orçamentos</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Tratamento ortodôntico" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Validade</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Itens</Label>
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input
                      className="flex-1"
                      placeholder="Descrição do procedimento"
                      value={item.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                    />
                    <Input
                      className="w-16"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))}
                    />
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeItem(i)} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Item
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condições de pagamento, garantias..." rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!title || createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="px-0">
        {quotes?.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-lg bg-muted/30">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">Nenhum orçamento criado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes?.map((quote) => {
              const cfg = statusConfig[quote.status] || statusConfig.draft;
              return (
                <div key={quote.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{quote.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(quote.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        {quote.validUntil && ` • Válido até ${format(new Date(quote.validUntil), "dd/MM/yyyy", { locale: ptBR })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                        try {
                          const res = await fetch(`/api/quotes/${quote.id}/pdf`, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                          });
                          if (!res.ok) throw new Error("Falha ao gerar PDF");
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `orcamento-${quote.id}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch {
                          toast({ title: "Erro ao baixar PDF", variant: "destructive" });
                        }
                      }}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Excluir?")) deleteMutation.mutate(quote.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {quote.status === "draft" && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => statusMutation.mutate({ id: quote.id, status: "sent" })}>
                        <Send className="h-3.5 w-3.5" /> Enviar
                      </Button>
                    </div>
                  )}
                  {quote.status === "sent" && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1 text-green-600" onClick={() => statusMutation.mutate({ id: quote.id, status: "accepted" })}>
                        <Check className="h-3.5 w-3.5" /> Aceito
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => statusMutation.mutate({ id: quote.id, status: "rejected" })}>
                        <X className="h-3.5 w-3.5" /> Recusado
                      </Button>
                    </div>
                  )}
                  {quote.notes && <p className="text-xs text-muted-foreground mt-2">{quote.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
