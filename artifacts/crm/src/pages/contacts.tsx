import { useListContacts, useCreateContact, getListContactsQueryKey, useListCompanies } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data: contacts, isLoading } = useListContacts(search ? { search: debouncedSearch } : undefined);
  const { data: companies } = useListCompanies();
  const createMutation = useCreateContact();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "", status: "lead", notes: "", companyId: "" });
  const statusOptions = [
    { value: "lead", label: "Potencial" },
    { value: "prospect", label: "Agendado" },
    { value: "client", label: "Ativo" },
    { value: "churned", label: "Inativo" },
  ];

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function handleExport() {
    if (!accessToken) return;
    fetch("/api/contacts/export", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "contacts.csv"; a.click();
        URL.revokeObjectURL(url);
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate(
      { data: { name: form.name, email: form.email || undefined, phone: form.phone || undefined, role: form.role || undefined, status: form.status as any, notes: form.notes || undefined, companyId: form.companyId ? Number(form.companyId) : null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
          toast({ title: "Paciente criado" });
          setOpen(false);
          setForm({ name: "", email: "", phone: "", role: "", status: "lead", notes: "", companyId: "" });
        },
      }
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "lead": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300";
      case "prospect": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "client": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "churned": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    const found = statusOptions.find(s => s.value === status);
    return found ? found.label : status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Pacientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus pacientes e potenciais.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-contact">
                <Plus className="h-4 w-4" />
                Adicionar Paciente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Paciente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nome *</label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Profissão</label>
                  <Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Clínica</label>
                    <Select value={form.companyId} onValueChange={v => setForm({ ...form, companyId: v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {companies?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Observações</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
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

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input           placeholder="Buscar pacientes..." className="pl-9 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <X className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setSearch("")} />}
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Clínica</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-card">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-40" /></td>
                  </tr>
                ))
              ) : contacts?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              ) : (
                contacts?.map((contact) => (
                  <tr key={contact.id} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/contacts/${contact.id}`} className="block">
                        {contact.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {contact.companyName || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className={getStatusColor(contact.status)}>
                        {formatStatus(contact.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {contact.email || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
