import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { CalendarClock, FileText, DollarSign, Phone, Mail, TrendingUp, TrendingDown, Clock, CheckCircle2, Circle, Stethoscope, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format, parseISO, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PortalData {
  patient: { id: number; name: string; email: string | null; phone: string | null; status: string };
  appointments: any[];
  treatmentPlans: any[];
  finances: { totalIncome: number; totalExpense: number; pendingIncome: number; balance: number };
  prescriptions: any[];
}

export default function PatientPortal() {
  const [, params] = useRoute("/paciente/:token");
  const token = params?.token;
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/patient-portal/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject("Paciente não encontrado"))
      .then(setData)
      .catch(e => setError(e === "Paciente não encontrado" ? e : "Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-teal-50 to-white dark:from-teal-950 dark:to-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-linear-to-b from-teal-50 to-white dark:from-teal-950 dark:to-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center p-8">
          <Stethoscope className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Acesso Não Encontrado</h1>
          <p className="text-muted-foreground mb-4">{error || "Token inválido"}</p>
          <p className="text-sm text-muted-foreground">Entre em contato com sua clínica para receber o link de acesso.</p>
        </Card>
      </div>
    );
  }

  const { patient, appointments, treatmentPlans, finances, prescriptions } = data;
  const upcomingAppts = appointments.filter(a => a.status !== "done" && (!a.dueDate || !isBefore(parseISO(a.dueDate), new Date())));
  const pastAppts = appointments.filter(a => a.status === "done" || (a.dueDate && isBefore(parseISO(a.dueDate), new Date())));

  return (
    <div className="min-h-screen bg-linear-to-b from-teal-50 to-white dark:from-teal-950 dark:to-background">
      <header className="border-b bg-white/80 dark:bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{patient.name}</p>
            <p className="text-xs text-muted-foreground">Portal do Paciente</p>
          </div>
          <Badge variant="outline">{patient.status === "client" ? "Ativo" : patient.status === "lead" ? "Potencial" : patient.status === "prospect" ? "Agendado" : "Inativo"}</Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {patient.phone && (
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {patient.phone}</span>
          )}
          {patient.email && (
            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {patient.email}</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" /> Total Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">R$ {finances.totalIncome.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-500" /> A Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">R$ {finances.pendingIncome.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" /> Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{appointments.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-5 w-5 text-primary" /> Próximas Consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma consulta agendada.</p>
            ) : (
              <div className="space-y-3">
                {upcomingAppts.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{a.title}</p>
                      {a.dueDate && <p className="text-xs text-muted-foreground">{format(parseISO(a.dueDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>}
                    </div>
                    <Badge variant={a.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{a.priority === "high" ? "Urgente" : a.priority === "medium" ? "Normal" : "Baixa"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {treatmentPlans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" /> Planos de Tratamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {treatmentPlans.map((plan: any) => (
                <div key={plan.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{plan.title}</h3>
                    <Badge variant={plan.status === "active" ? "default" : plan.status === "completed" ? "outline" : "secondary"}>
                      {plan.status === "draft" ? "Rascunho" : plan.status === "active" ? "Em Andamento" : plan.status === "completed" ? "Concluído" : plan.status === "cancelled" ? "Cancelado" : plan.status}
                    </Badge>
                  </div>
                  {plan.procedures?.length > 0 && (
                    <div className="space-y-1.5 mt-3">
                      {plan.procedures.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            {p.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>{p.procedureName}</span>
                            {p.toothNumber && <span className="text-xs text-muted-foreground">Dente {p.toothNumber}</span>}
                          </div>
                          <span className="font-medium">R$ {Number(p.value).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-3 pt-2 border-t text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-primary">R$ {Number(plan.totalValue).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {prescriptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="h-5 w-5 text-primary" /> Prescrições
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prescriptions.map((rx: any) => (
                <div key={rx.id} className="flex gap-3 border rounded-lg p-4">
                  <div className="shrink-0 p-2 rounded-md bg-green-50 dark:bg-green-950 h-fit">
                    <Pill className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{rx.medication}</h3>
                      <span className="text-xs text-muted-foreground">{format(parseISO(rx.createdAt), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span><strong>Posologia:</strong> {rx.dosage}</span>
                      <span><strong>Duração:</strong> {rx.duration}</span>
                    </div>
                    {rx.notes && <p className="text-sm text-muted-foreground mt-2">{rx.notes}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {pastAppts.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground py-2">
              Consultas Anteriores ({pastAppts.length})
            </summary>
            <div className="mt-2 space-y-2">
              {pastAppts.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">{a.title}</p>
                    {a.dueDate && <p className="text-xs text-muted-foreground">{format(parseISO(a.dueDate), "dd/MM/yyyy")}</p>}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        <footer className="text-center text-xs text-muted-foreground py-8">
          <p>OdontoFlow — Portal do Paciente</p>
        </footer>
      </main>
    </div>
  );
}
