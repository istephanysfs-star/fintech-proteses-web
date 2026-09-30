import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Prosthesis3DPreview,
  PROSTHESIS_MODELS,
  type ProsthesisModelId,
} from "@/components/prosthesis-3d-preview";
import { useServerFn } from "@tanstack/react-start";
import { createLoanApplication } from "@/lib/loans.functions";
import { getApprovedClinics } from "@/lib/clinics.functions";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const proposalSchema = z.object({
  requestedAmount: z.number().positive("Valor deve ser maior que zero"),
  downPayment: z.number().min(0),
  installments: z.number().int().min(1).max(60),
  clinicId: z.string().optional(),
  purpose: z.string().optional(),
});

type ProposalForm = z.infer<typeof proposalSchema>;

interface ProposalFormProps {
  onSuccess?: () => void;
}

export function ProposalForm({ onSuccess }: ProposalFormProps) {
  const createApplication = useServerFn(createLoanApplication);
  const fetchClinics = useServerFn(getApprovedClinics);

  const { data: clinicsData } = useQuery({
    queryKey: ["approved-clinics"],
    queryFn: () => fetchClinics({ data: undefined }),
  });

  const clinics = clinicsData?.clinics ?? [];

  const [amount, setAmount] = useState(15000);
  const [downPayment, setDownPayment] = useState(3000);
  const [installments, setInstallments] = useState(24);
  const [selectedModel, setSelectedModel] = useState<ProsthesisModelId | null>(null);
  const interestRate = 1.99;

  const form = useForm<ProposalForm>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      requestedAmount: amount,
      downPayment,
      installments,
      clinicId: "",
      purpose: "",
    },
  });

  const totalAmount = amount;
  const financedAmount = Math.max(0, totalAmount - downPayment);
  const monthlyRate = interestRate / 100;
  const monthlyPayment =
    monthlyRate === 0
      ? financedAmount / installments
      : (financedAmount * monthlyRate * Math.pow(1 + monthlyRate, installments)) /
        (Math.pow(1 + monthlyRate, installments) - 1);
  const totalCost = monthlyPayment * installments + downPayment;

  async function onSubmit(values: ProposalForm) {
    try {
      const selected = PROSTHESIS_MODELS.find((m) => m.id === selectedModel);
      const purposeText = [
        values.purpose,
        selected ? `[Modelo escolhido: ${selected.name}]` : null,
      ]
        .filter(Boolean)
        .join(" ");
      await createApplication({
        data: {
          requestedAmount: totalAmount,
          downPayment: values.downPayment,
          installments: values.installments,
          monthlyPayment: Number(monthlyPayment.toFixed(2)),
          interestRate,
          totalCost: Number(totalCost.toFixed(2)),
          clinicId: values.clinicId || undefined,
          purpose: purposeText,
        },
      });
      toast.success("Proposta enviada com sucesso!");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar proposta");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
      {/* 1. Configuration Sliders & Selects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 border-b border-border pb-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Valor do tratamento</Label>
            <span className="text-lg font-semibold text-primary">{formatCurrency(amount)}</span>
          </div>
          <Slider
            min={1000}
            max={100000}
            step={500}
            value={[amount]}
            onValueChange={(value) => {
              setAmount(value[0]);
              form.setValue("requestedAmount", value[0]);
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Entrada</Label>
            <span className="text-lg font-semibold text-primary">{formatCurrency(downPayment)}</span>
          </div>
          <Slider
            min={0}
            max={amount}
            step={500}
            value={[downPayment]}
            onValueChange={(value) => {
              setDownPayment(value[0]);
              form.setValue("downPayment", value[0]);
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Parcelas</Label>
            <span className="text-lg font-semibold text-primary">{installments}x</span>
          </div>
          <Slider
            min={1}
            max={48}
            step={1}
            value={[installments]}
            onValueChange={(value) => {
              setInstallments(value[0]);
              form.setValue("installments", value[0]);
            }}
          />
        </div>

        <div>
          <Label htmlFor="clinic">Clínica parceira (opcional)</Label>
          <Select
            onValueChange={(value) => form.setValue("clinicId", value === "none" ? "" : value)}
            defaultValue="none"
          >
            <SelectTrigger id="clinic" className="mt-1.5">
              <SelectValue placeholder="Selecione uma clínica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="purpose">Finalidade / observação</Label>
          <Input
            id="purpose"
            placeholder="Ex: prótese de quadril para reabilitação"
            className="mt-1.5"
            {...form.register("purpose")}
          />
        </div>
      </div>

      {/* 2. Full-Width 3D Models Catalog Grid */}
      <div className="space-y-4 w-full">
        <div>
          <Label className="text-lg font-bold text-foreground">Modelos disponíveis em 3D</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha um modelo do nosso catálogo completo — clique no card para visualizar em 3D e selecionar.
          </p>
        </div>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 w-full">
          {PROSTHESIS_MODELS.map((model) => {
            const active = selectedModel === model.id;
            return (
              <button
                type="button"
                key={model.id}
                onClick={() => {
                  setSelectedModel(active ? null : model.id);
                  if (!active) {
                    setAmount(model.basePrice);
                    form.setValue("requestedAmount", model.basePrice);
                    if (downPayment > model.basePrice) {
                      setDownPayment(0);
                      form.setValue("downPayment", 0);
                    }
                  }
                }}
                className={
                  "group overflow-hidden rounded-xl border text-left transition-all duration-200 h-full flex flex-col justify-between shadow-sm hover:shadow-md " +
                  (active
                    ? "border-primary ring-2 ring-primary bg-primary/10 dark:bg-primary/15"
                    : "border-border hover:border-primary/60 bg-card hover:bg-accent/40")
                }
              >
                <div className="relative w-full aspect-[4/3] bg-slate-950/80 overflow-hidden">
                  <Prosthesis3DPreview
                    modelId={model.id}
                    autoRotate={active}
                    className="h-full w-full"
                  />
                  {active && (
                    <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      SELECIONADO
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {model.category}
                    </span>
                    <h3 className="text-sm font-bold text-foreground mt-0.5 line-clamp-1">{model.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {model.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">A partir de</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(model.basePrice)}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                      active 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground'
                    }`}>
                      {active ? "Ativo" : "Escolher"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Summary & Submit Button */}
      <div className="space-y-4 border-t border-border pt-6">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Parcela mensal</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyPayment)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total estimado</p>
                <p className="text-xl font-semibold text-foreground">{formatCurrency(totalCost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor a financiar</p>
                <p className="text-xl font-semibold text-primary">{formatCurrency(financedAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa de juros</p>
                <p className="text-sm font-medium text-foreground">{interestRate}% ao mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full text-base font-semibold">
          Enviar Proposta de Financiamento
        </Button>
      </div>
    </form>
  );
}
