import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Pill,
  Eye,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClinicalNote {
  id: number;
  contactId: number;
  authorId: number | null;
  type: "evolution" | "prescription" | "observation";
  content: string;
  createdAt: string;
}

interface Prescription {
  id: number;
  contactId: number;
  authorId: number | null;
  medication: string;
  dosage: string;
  duration: string;
  notes: string | null;
  createdAt: string;
}

interface ClinicalRecordTabProps {
  contactId: number;
}

const typeLabels: Record<string, { label: string; icon: any; color: string }> = {
  evolution: { label: "Evolução", icon: FileText, color: "text-blue-600 bg-blue-50 dark:bg-blue-950" },
  prescription: { label: "Prescrição", icon: Pill, color: "text-green-600 bg-green-50 dark:bg-green-950" },
  observation: { label: "Observação", icon: Eye, color: "text-amber-600 bg-amber-50 dark:bg-amber-950" },
};

export function ClinicalRecordTab({ contactId }: ClinicalRecordTabProps) {
  const [noteType, setNoteType] = useState<"evolution" | "prescription" | "observation">("evolution");
  const [noteContent, setNoteContent] = useState("");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [duration, setDuration] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);

  const { toast } = useToast();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes, isLoading: notesLoading } = useQuery<ClinicalNote[]>({
    queryKey: ["clinical-notes", contactId],
    queryFn: async () => {
      const res = await fetch(`/api/clinical-records/notes?contactId=${contactId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Erro ao carregar notas");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery<Prescription[]>({
    queryKey: ["prescriptions", contactId],
    queryFn: async () => {
      const res = await fetch(`/api/clinical-records/prescriptions?contactId=${contactId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Erro ao carregar prescrições");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: { type: string; content: string }) => {
      const res = await fetch("/api/clinical-records/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ contactId, ...data }),
      });
      if (!res.ok) throw new Error("Erro ao criar nota");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-notes", contactId] });
      setNoteContent("");
      setNoteDialogOpen(false);
      toast({ title: "Nota registrada" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar nota", variant: "destructive" });
    },
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: async (data: { medication: string; dosage: string; duration: string; notes: string }) => {
      const res = await fetch("/api/clinical-records/prescriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ contactId, ...data }),
      });
      if (!res.ok) throw new Error("Erro ao criar prescrição");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions", contactId] });
      setMedication("");
      setDosage("");
      setDuration("");
      setPrescriptionNotes("");
      setPrescriptionDialogOpen(false);
      toast({ title: "Prescrição registrada" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar prescrição", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/clinical-records/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Erro ao deletar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-notes", contactId] });
      toast({ title: "Nota excluída" });
    },
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/clinical-records/prescriptions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Erro ao deletar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions", contactId] });
      toast({ title: "Prescrição excluída" });
    },
  });

  const allItems = [
    ...(notes || []).map((n) => ({
      kind: "note" as const,
      ...n,
      sortDate: n.createdAt,
    })),
    ...(prescriptions || []).map((p) => ({
      kind: "prescription" as const,
      ...p,
      sortDate: p.createdAt,
    })),
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  if (notesLoading || prescriptionsLoading) {
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
        <div>
          <CardTitle className="text-xl">Prontuário Clínico</CardTitle>
        </div>
        <div className="flex gap-2">
          <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Nova Nota
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Nota Clínica</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={noteType} onValueChange={(v) => setNoteType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evolution">Evolução</SelectItem>
                      <SelectItem value="prescription">Prescrição</SelectItem>
                      <SelectItem value="observation">Observação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Descreva a evolução clínica..."
                    rows={5}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => createNoteMutation.mutate({ type: noteType, content: noteContent })}
                    disabled={!noteContent.trim() || createNoteMutation.isPending}
                  >
                    {createNoteMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={prescriptionDialogOpen} onOpenChange={setPrescriptionDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Nova Prescrição
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Prescrição</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Medicamento</Label>
                  <Input value={medication} onChange={(e) => setMedication(e.target.value)} placeholder="Ex: Amoxicilina 500mg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Posologia</Label>
                    <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Ex: 3x ao dia" />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração</Label>
                    <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ex: 7 dias" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={prescriptionNotes} onChange={(e) => setPrescriptionNotes(e.target.value)} placeholder="Instruções adicionais..." rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPrescriptionDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() =>
                      createPrescriptionMutation.mutate({
                        medication,
                        dosage,
                        duration,
                        notes: prescriptionNotes,
                      })
                    }
                    disabled={!medication || !dosage || !duration || createPrescriptionMutation.isPending}
                  >
                    {createPrescriptionMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {allItems.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-lg bg-muted/30">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">Nenhum registro clínico.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allItems.map((item) => {
              if (item.kind === "note") {
                const typeInfo = typeLabels[item.type] || typeLabels.observation;
                const Icon = typeInfo.icon;
                return (
                  <div key={`note-${item.id}`} className="flex gap-3 items-start p-3 rounded-lg border bg-card">
                    <div className={`shrink-0 p-2 rounded-md ${typeInfo.color} h-fit`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{typeInfo.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm("Excluir esta nota?")) deleteNoteMutation.mutate(item.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.content}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={`rx-${item.id}`} className="flex gap-3 items-start p-3 rounded-lg border bg-card">
                  <div className="shrink-0 p-2 rounded-md text-green-600 bg-green-50 dark:bg-green-950 h-fit">
                    <Pill className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Prescrição — {item.medication}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm("Excluir esta prescrição?")) deletePrescriptionMutation.mutate(item.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm">
                      <span className="text-muted-foreground">
                        <strong>Posologia:</strong> {item.dosage}
                      </span>
                      <span className="text-muted-foreground">
                        <strong>Duração:</strong> {item.duration}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
