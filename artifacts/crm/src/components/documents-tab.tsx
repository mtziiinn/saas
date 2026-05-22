import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Upload,
  FileText,
  Trash2,
  Download,
  FileIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Document {
  id: number;
  originalName: string;
  mimeType: string;
  filename: string;
  createdAt: string;
  size: number;
}

interface DocumentsTabProps {
  entityType: "contact" | "company";
  entityId: number;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_SIZE = 10 * 1024 * 1024;

export function DocumentsTab({ entityType, entityId }: DocumentsTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["attachments", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(
        `/api/attachments?entityType=${entityType}&entityId=${entityId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) throw new Error("Erro ao carregar documentos");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/attachments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Erro ao deletar documento");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", entityType, entityId],
      });
      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso.",
      });
    },
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !accessToken) return;

    if (file.size > MAX_SIZE) {
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Tipo de arquivo não permitido.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", String(entityId));

      const res = await fetch("/api/attachments/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || "Falha no upload");
      }

      toast({
        title: "Sucesso",
        description: `Arquivo "${file.name}" enviado!`,
      });
      queryClient.invalidateQueries({
        queryKey: ["attachments", entityType, entityId],
      });
    } catch (error) {
      toast({
        title: "Erro no Upload",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Documentos e Anexos</CardTitle>
          <CardDescription>
            Gerencie arquivos e exames vinculados.
          </CardDescription>
        </div>
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <Button asChild disabled={isUploading}>
            <label htmlFor="file-upload" className="cursor-pointer">
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? "Enviando..." : "Novo Arquivo"}
            </label>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : documents?.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-lg bg-muted/30">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Nenhum documento encontrado.
            </p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-primary" />
                        <span
                          className="truncate max-w-50"
                          title={doc.originalName}
                        >
                          {doc.originalName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(doc.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const res = await fetch(`/api/attachments/${doc.id}/download`, {
                              headers: { Authorization: `Bearer ${accessToken}` },
                            });
                            if (res.ok) {
                              const blob = await res.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = doc.originalName;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMutation.mutate(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
