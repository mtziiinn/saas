import { useGetCompany, getGetCompanyQueryKey, useDeleteCompany, useUpdateCompany, useListCompanies } from "@workspace/api-client-react";
import { useRoute, useLocation, Link } from "wouter";
import { ArrowLeft, Globe, Briefcase, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function CompanyDetail() {
  const [, params] = useRoute("/companies/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: company, isLoading } = useGetCompany(id, {
    query: {
      enabled: !!id,
      queryKey: getGetCompanyQueryKey(id)
    }
  });

  const deleteMutation = useDeleteCompany();
  const updateMutation = useUpdateCompany();

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir esta clínica?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Clínica excluída" });
          queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
          setLocation("/companies");
        }
      });
    }
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      website: formData.get("website") as string,
      industry: formData.get("industry") as string,
      size: formData.get("size") as string,
      notes: formData.get("notes") as string,
    };
    updateMutation.mutate({ id, data }, {
      onSuccess: () => {
        toast({ title: "Clínica atualizada" });
        queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey(id) });
        setIsEditOpen(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!company) {
    return     <div className="text-center py-12 text-muted-foreground">Clínica não encontrada.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <Link href="/companies" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Clínicas
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{company.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">
              Added {format(new Date(company.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Clínica</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" defaultValue={company?.name} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" name="website" defaultValue={company?.website || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input id="industry" name="industry" defaultValue={company?.industry || ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Porte</Label>
                  <Input id="size" name="size" defaultValue={company?.size || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" name="notes" defaultValue={company?.notes || ""} rows={4} />
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
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informações da Clínica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span>{company.website || "Sem site"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{company.industry || "Sem especialidade"} ({company.size || "Porte não informado"})</span>
            </div>

            {company.notes && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-2 text-sm">Observações</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
