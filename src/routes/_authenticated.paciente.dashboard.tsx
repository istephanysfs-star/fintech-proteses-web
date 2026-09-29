import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getMyLoanApplications } from "@/lib/loans.functions";
import { getCurrentUserProfile, updateProfile } from "@/lib/auth.functions";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProposalForm } from "@/components/proposal-form";
import { toast } from "sonner";
import {
  User,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  PlusCircle,
  DollarSign,
  Building2,
  Calendar,
  Phone,
  Mail,
  Edit3,
  FileCheck,
  ShieldCheck,
  Loader2,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/paciente/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do Paciente — PrótesePay" },
      {
        name: "description",
        content: "Acompanhe suas propostas de financiamento e dados do perfil integrados ao Supabase.",
      },
    ],
  }),
  component: PatientDashboard,
});

function PatientDashboard() {
  const fetchApplications = useServerFn(getMyLoanApplications);
  const fetchProfile = useServerFn(getCurrentUserProfile);
  const updateProfileFn = useServerFn(updateProfile);
  const queryClient = useQueryClient();

  // 1. Supabase Query: Patient Profile
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => fetchProfile({ data: undefined }),
  });

  // 2. Supabase Query: Patient Loan Applications
  const { data: loansData, isLoading: isLoansLoading } = useQuery({
    queryKey: ["my-loan-applications"],
    queryFn: () => fetchApplications({ data: undefined }),
  });

  const profile = profileData?.profile;
  const userEmail = profileData?.email;
  const applications = loansData?.applications ?? [];

  // Edit Profile Form State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setDocument(profile.document ?? "");
      setBirthDate(profile.birth_date ?? "");
    }
  }, [profile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      await updateProfileFn({
        data: {
          fullName,
          phone,
          document,
          birthDate,
        },
      });
      toast.success("Perfil atualizado no Supabase com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
      setIsEditDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar perfil");
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  // Calculate metrics dynamically from Supabase
  const totalProposals = applications.length;
  const approvedProposals = applications.filter((a: any) => a.status === "approved");
  const pendingProposals = applications.filter((a: any) => a.status === "pending");
  const rejectedProposals = applications.filter(
    (a: any) => a.status === "rejected" || a.status === "cancelled",
  );

  const totalRequestedAmount = applications.reduce(
    (acc: number, a: any) => acc + (Number(a.requested_amount) || 0),
    0,
  );
  const totalApprovedFinanced = approvedProposals.reduce(
    (acc: number, a: any) => acc + (Number(a.requested_amount) || 0),
    0,
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Header & Profile Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6 border-border">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Painel do Paciente
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Supabase Integrado
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Gerencie seus dados cadastrais e acompanhe todas as suas propostas em tempo real.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
              className="inline-flex items-center gap-2 self-start md:self-auto cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              Editar Meus Dados
            </Button>
          </div>

          {/* Profile Quick Summary Card (Real Supabase Profile Data) */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Dados do Perfil no Supabase
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isProfileLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando informações do perfil...
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-muted-foreground" /> Nome Completo
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {profile?.full_name || "Não informado"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" /> E-mail
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {userEmail || "Não informado"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <FileCheck className="h-3.5 w-3.5 text-muted-foreground" /> CPF / Documento
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {profile?.document || "Não cadastrado"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Telefone
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {profile?.phone || "Não cadastrado"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metrics Overview Cards (Calculated directly from Supabase DB) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Propostas
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProposals}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Registradas no banco de dados
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Aprovadas
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {approvedProposals.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Financiamentos liberados
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Em Análise
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {pendingProposals.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aguardando parecer técnico
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Recusadas / Outras
                </CardTitle>
                <XCircle className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {rejectedProposals.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Propostas não ativas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Financial Totals Summary Bar */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Total Solicitado em Propostas
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(totalRequestedAmount)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Valor Total Aprovado
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalApprovedFinanced)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Dashboard Layout: Form + Applications List */}
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Column: Create Proposal Form */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  Nova Proposta de Financiamento
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Simule e solicite o financiamento de sua prótese ortopédica diretamente no Supabase.
                </p>
              </div>

              <Card className="border-border">
                <CardContent className="p-6">
                  <ProposalForm
                    onSuccess={() =>
                      queryClient.invalidateQueries({ queryKey: ["my-loan-applications"] })
                    }
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Applications List with Tabs (Fetched live from Supabase) */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Minhas Propostas Registradas
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Consulte todos os dados gravados na tabela <code className="text-xs bg-muted px-1.5 py-0.5 rounded">loan_applications</code>.
                </p>
              </div>

              {isLoansLoading ? (
                <Card className="border-border p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Carregando suas propostas do Supabase...
                  </p>
                </Card>
              ) : (
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">Todas ({totalProposals})</TabsTrigger>
                    <TabsTrigger value="pending">Análise ({pendingProposals.length})</TabsTrigger>
                    <TabsTrigger value="approved">Aprovadas ({approvedProposals.length})</TabsTrigger>
                    <TabsTrigger value="rejected">Recusadas ({rejectedProposals.length})</TabsTrigger>
                  </TabsList>

                  {/* Render Applications Helper */}
                  {["all", "pending", "approved", "rejected"].map((tabKey) => {
                    const filteredList =
                      tabKey === "all"
                        ? applications
                        : tabKey === "pending"
                          ? pendingProposals
                          : tabKey === "approved"
                            ? approvedProposals
                            : rejectedProposals;

                    return (
                      <TabsContent key={tabKey} value={tabKey} className="mt-4 space-y-4">
                        {filteredList.length === 0 ? (
                          <Card className="border-dashed border-border p-8 text-center">
                            <Info className="h-8 w-8 text-muted-foreground mx-auto" />
                            <p className="mt-2 text-sm font-medium text-foreground">
                              Nenhuma proposta encontrada nesta categoria.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Preencha o formulário ao lado para cadastrar uma nova proposta.
                            </p>
                          </Card>
                        ) : (
                          filteredList.map((app: any) => (
                            <Card key={app.id} className="border-border shadow-sm hover:border-primary/50 transition-colors">
                              <CardContent className="p-6 space-y-4">
                                {/* Application Top Info */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                                  <div className="space-y-0.5">
                                    <span className="text-xs font-mono text-muted-foreground">
                                      ID: #{app.id.substring(0, 8)}...
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Calendar className="h-3.5 w-3.5" />
                                      Solicitado em: {formatDate(app.created_at)}
                                    </div>
                                  </div>

                                  <StatusBadge status={app.status} />
                                </div>

                                {/* Main Values Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-muted/30 p-3.5 rounded-lg text-sm">
                                  <div>
                                    <span className="text-xs text-muted-foreground block">
                                      Valor Solicitado
                                    </span>
                                    <span className="font-semibold text-foreground text-base">
                                      {formatCurrency(app.requested_amount)}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-xs text-muted-foreground block">
                                      Entrada Solicitada
                                    </span>
                                    <span className="font-medium text-foreground">
                                      {formatCurrency(app.down_payment)}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-xs text-muted-foreground block">
                                      Condição Escolhida
                                    </span>
                                    <span className="font-medium text-foreground">
                                      {app.installments}x de {formatCurrency(app.monthly_payment)}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-xs text-muted-foreground block">
                                      Custo Total Estimado
                                    </span>
                                    <span className="font-medium text-foreground">
                                      {formatCurrency(app.total_cost)}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-xs text-muted-foreground block">
                                      Taxa de Juros
                                    </span>
                                    <span className="font-medium text-foreground">
                                      {app.interest_rate}% a.m.
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-xs text-muted-foreground block">
                                      Valor Financiado
                                    </span>
                                    <span className="font-medium text-primary">
                                      {formatCurrency(
                                        Math.max(0, app.requested_amount - app.down_payment),
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* Clinic details from Supabase Join */}
                                <div className="space-y-1.5 text-xs border-l-2 border-primary/40 pl-3">
                                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                                    <Building2 className="h-3.5 w-3.5 text-primary" />
                                    Clínica Parceira:{" "}
                                    <span className="font-semibold">
                                      {app.clinics?.name || "Nenhuma clínica selecionada"}
                                    </span>
                                  </div>
                                  {app.clinics && (app.clinics.city || app.clinics.phone) && (
                                    <p className="text-muted-foreground pl-5">
                                      {[
                                        app.clinics.city
                                          ? `${app.clinics.city} - ${app.clinics.state || ""}`
                                          : null,
                                        app.clinics.phone ? `Tel: ${app.clinics.phone}` : null,
                                        app.clinics.email ? `E-mail: ${app.clinics.email}` : null,
                                      ]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </p>
                                  )}
                                </div>

                                {/* Purpose / Observations */}
                                {app.purpose && (
                                  <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded border border-border">
                                    <span className="font-semibold text-foreground">
                                      Finalidade / Detalhes:{" "}
                                    </span>
                                    {app.purpose}
                                  </div>
                                )}

                                {/* Admin / Reviewer Notes from Supabase */}
                                {app.notes && (
                                  <div className="text-xs text-amber-800 dark:text-amber-200 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                                    <span className="font-semibold flex items-center gap-1">
                                      <Info className="h-3.5 w-3.5" /> Parecer da Análise:
                                    </span>
                                    <p className="mt-0.5">{app.notes}</p>
                                    {app.reviewed_at && (
                                      <span className="block mt-1 text-[11px] opacity-75">
                                        Avaliado em: {formatDate(app.reviewed_at)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveProfile}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Editar Dados do Perfil
              </DialogTitle>
              <DialogDescription>
                Atualize suas informações no Supabase. Todos os dados são sincronizados com a tabela{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">profiles</code>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">CPF / Documento</Label>
                <Input
                  id="document"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone de Contato</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdatingProfile}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdatingProfile} className="gap-2">
                {isUpdatingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar no Supabase
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
