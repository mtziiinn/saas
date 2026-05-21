import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Percent, UserPlus } from "lucide-react";

interface TeamUser {
  id: number;
  name: string;
  email: string;
  role: string;
  commissionPercentage: string;
}

export default function Settings() {
  const { user: currentUser, accessToken, refreshUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(currentUser?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Team management
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [newUserDialogOpen, setNewUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user", commissionPercentage: "0" });

  function fetchTeam() {
    if (!accessToken) return;
    setTeamLoading(true);
    fetch("/api/users", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(data => setTeam(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setTeamLoading(false));
  }

  useEffect(() => { fetchTeam(); }, [accessToken]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to update profile");
      }
      const data = await res.json();
      refreshUser(data.user);
      toast({ title: "Perfil atualizado" });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro ao atualizar" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "Senhas não conferem" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to update password");
      }
      toast({ title: "Senha alterada com sucesso" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro ao alterar senha" });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua conta e preferências.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" value={currentUser?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-name">Nome</Label>
              <Input id="settings-name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? "Alterando..." : "Alterar Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Equipe
            </CardTitle>
            <Dialog open={newUserDialogOpen} onOpenChange={setNewUserDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><UserPlus className="h-4 w-4" /> Novo Profissional</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Profissional</DialogTitle></DialogHeader>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newUser.name || !newUser.email || !newUser.password) return;
                  try {
                    const res = await fetch("/api/users", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify(newUser),
                    });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Erro"); }
                    toast({ title: "Profissional criado" });
                    setNewUserDialogOpen(false);
                    setNewUser({ name: "", email: "", password: "", role: "user", commissionPercentage: "0" });
                    fetchTeam();
                  } catch (err) {
                    toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro ao criar" });
                  }
                }} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="nu-name">Nome *</Label>
                    <Input id="nu-name" placeholder="Ex: Dra. Ana Oliveira" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nu-email">Email *</Label>
                    <Input id="nu-email" type="email" placeholder="ana@clinica.com" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nu-password">Senha *</Label>
                    <Input id="nu-password" type="password" placeholder="Mínimo 8 caracteres" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={8} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nu-role">Função</Label>
                      <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                        <SelectTrigger id="nu-role"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Profissional</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nu-commission">Comissão (%)</Label>
                      <Input id="nu-commission" type="number" min={0} max={100} step="0.5" placeholder="Ex: 30" value={newUser.commissionPercentage} onChange={e => setNewUser({ ...newUser, commissionPercentage: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setNewUserDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">Criar Profissional</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : team.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Função</th>
                    <th className="px-4 py-3 font-medium">Comissão</th>
                    <th className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {team.map(u => (
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? "Admin" : "Profissional"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          {u.commissionPercentage}%
                          <Percent className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Excluir"
                            onClick={async () => {
                              if (!confirm(`Excluir ${u.name}?`)) return;
                              try {
                                const res = await fetch(`/api/users/${u.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                                  body: JSON.stringify({ role: "inactive" }),
                                });
                                if (!res.ok) throw new Error();
                                toast({ title: "Profissional desativado" });
                                fetchTeam();
                              } catch {
                                toast({ title: "Erro ao desativar", variant: "destructive" });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
