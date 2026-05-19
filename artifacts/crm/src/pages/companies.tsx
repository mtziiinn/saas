import { useListCompanies, useCreateCompany, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, Building2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Companies() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data: companies, isLoading } = useListCompanies(search ? { search: debouncedSearch } : undefined);
  const createMutation = useCreateCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", website: "", industry: "", size: "", notes: "" });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate(
      { data: { name: form.name, website: form.website || undefined, industry: form.industry || undefined, size: form.size || undefined, notes: form.notes || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
          toast({ title: "Clínica criada" });
          setOpen(false);
          setForm({ name: "", website: "", industry: "", size: "", notes: "" });
        },
      }
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Clínicas</h1>
          <p className="text-muted-foreground mt-1">Gerencie as clínicas parceiras.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Clínica
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Clínica</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Website</label>
                <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Especialidade</label>
                  <Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Porte</label>
                  <Input value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Observações</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
              <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Salvando..." : "Salvar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input           placeholder="Buscar clínicas..." className="pl-9 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <X className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setSearch("")} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))
        ) : companies?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card">
            Nenhuma clínica encontrada.
          </div>
        ) : (
          companies?.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{company.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{company.industry || "Sem especialidade"}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                        <span>{company.contactCount} pacientes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
