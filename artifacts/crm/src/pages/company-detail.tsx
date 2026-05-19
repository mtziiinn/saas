import { useGetCompany, getGetCompanyQueryKey, useDeleteCompany } from "@workspace/api-client-react";
import { useRoute, useLocation, Link } from "wouter";
import { ArrowLeft, Globe, Briefcase, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function CompanyDetail() {
  const [, params] = useRoute("/companies/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: company, isLoading } = useGetCompany(id, {
    query: {
      enabled: !!id,
      queryKey: getGetCompanyQueryKey(id)
    }
  });

  const deleteMutation = useDeleteCompany();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this company?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Company deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
          setLocation("/companies");
        }
      });
    }
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
    return <div className="text-center py-12 text-muted-foreground">Company not found.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <Link href="/companies" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Companies
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
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" className="gap-2" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span>{company.website || "No website"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{company.industry || "No industry"} ({company.size || "Unknown size"})</span>
            </div>

            {company.notes && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-2 text-sm">Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
