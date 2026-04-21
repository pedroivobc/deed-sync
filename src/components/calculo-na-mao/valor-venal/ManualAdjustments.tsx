import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CurrencyInput } from "../shared/CurrencyInput";
import { normalizeIsotima } from "@/lib/calculo-na-mao/valorVenalLookup";

export interface ValorVenalForm {
  inscricao: string;
  endereco: string;
  isotima: string;
  tipo: string;
  padrao: string;
  vvTerrenoIPTU: number;
  vM2TerrenoIPTU: number;
  vvEdificacaoIPTU: number;
  vM2EdificacaoIPTU: number;
  valorM2TerrenoPJF: number;
  valorM2EdificacaoPJF: number;
  fatorComercializacao: number;
}

interface Props {
  value: ValorVenalForm;
  onChange: (v: ValorVenalForm) => void;
  warnings: { isotimaNotFound: boolean; tipoPadraoNotFound: boolean; fatorDefault: boolean };
}

const TIPOS = ["APTO", "CASA", "SALA", "LOJA", "TELHEIRO", "GALPAO"];
const PADROES = ["OTIMO", "BOM", "REGULAR", "BAIXO", "POPULAR"];

export function ManualAdjustments({ value, onChange, warnings }: Props) {
  const set = <K extends keyof ValorVenalForm>(key: K, v: ValorVenalForm[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Identificação do imóvel</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Endereço</Label>
            <Input value={value.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, número, bairro" />
          </div>
          <div>
            <Label>Inscrição imobiliária</Label>
            <Input value={value.inscricao} onChange={(e) => set("inscricao", e.target.value)} placeholder="Ex: 01.02.003.0004.001" />
          </div>
          <div>
            <Label>Área isótima</Label>
            <Input
              value={value.isotima}
              onChange={(e) => set("isotima", e.target.value)}
              onBlur={(e) => set("isotima", normalizeIsotima(e.target.value))}
              placeholder="Ex: RE227"
            />
          </div>
          <div>
            <Label>Tipo de imóvel</Label>
            <Select value={value.tipo || undefined} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Padrão construtivo</Label>
            <Select value={value.padrao || undefined} onValueChange={(v) => set("padrao", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {PADROES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados do carnê do IPTU</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Valor venal terreno (IPTU)</Label>
            <CurrencyInput value={value.vvTerrenoIPTU} onValueChange={(v) => set("vvTerrenoIPTU", v)} />
          </div>
          <div>
            <Label>Valor m² terreno (IPTU)</Label>
            <CurrencyInput value={value.vM2TerrenoIPTU} onValueChange={(v) => set("vM2TerrenoIPTU", v)} />
          </div>
          <div>
            <Label>Valor venal edificação (IPTU)</Label>
            <CurrencyInput value={value.vvEdificacaoIPTU} onValueChange={(v) => set("vvEdificacaoIPTU", v)} />
          </div>
          <div>
            <Label>Valor m² edificação (IPTU)</Label>
            <CurrencyInput value={value.vM2EdificacaoIPTU} onValueChange={(v) => set("vM2EdificacaoIPTU", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Parâmetros atualizados (PJF)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {warnings.isotimaNotFound && (
            <Alert variant="default" className="border-warning/40 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription>
                Código <strong>{value.isotima}</strong> não encontrado na Planta Genérica de Valores. Preencha o valor de m² do terreno manualmente.
              </AlertDescription>
            </Alert>
          )}
          {warnings.tipoPadraoNotFound && (
            <Alert variant="default" className="border-warning/40 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription>
                Combinação <strong>{value.tipo}/{value.padrao}</strong> não encontrada na tabela de construção. Ajuste o valor m² edificação manualmente.
              </AlertDescription>
            </Alert>
          )}
          {warnings.fatorDefault && value.isotima && value.tipo && (
            <Alert>
              <AlertDescription className="text-xs">
                Fator de comercialização padrão (1,00) aplicado — combinação {value.isotima}/{value.tipo} sem fator específico.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Valor m² terreno (PGV)</Label>
              <CurrencyInput value={value.valorM2TerrenoPJF} onValueChange={(v) => set("valorM2TerrenoPJF", v)} />
            </div>
            <div>
              <Label>Valor m² edificação</Label>
              <CurrencyInput value={value.valorM2EdificacaoPJF} onValueChange={(v) => set("valorM2EdificacaoPJF", v)} />
            </div>
            <div>
              <Label>Fator comercialização</Label>
              <Input
                inputMode="decimal"
                value={value.fatorComercializacao}
                onChange={(e) => {
                  const n = parseFloat(e.target.value.replace(",", "."));
                  set("fatorComercializacao", isNaN(n) ? 0 : n);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}