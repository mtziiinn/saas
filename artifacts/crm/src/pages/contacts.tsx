import { useListContacts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Contacts() {
  const { data: contacts, isLoading } = useListContacts();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "lead": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "prospect": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "client": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "churned": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">Manage your leads and clients.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/api/contacts/export" download>
            <Button variant="outline" className="gap-2" data-testid="button-export-csv">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </a>
          <Button className="gap-2" data-testid="button-add-contact">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." className="pl-9 bg-card" />
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Company</th>
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
                    No contacts found.
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
                        {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
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
