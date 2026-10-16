"use client";

import { useEffect, useState } from "react";
import { Settings, Lock, KeyRound, Building, Clock, Save, CheckCircle2, AlertCircle } from "lucide-react";

export default function ConfiguracoesPage() {
  const [terminalPin, setTerminalPin] = useState("1234");
  const [companyName, setCompanyName] = useState("Gestão de Presença & Biometria");
  const [toleranceDefault, setToleranceDefault] = useState("15");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          if (data.settings.terminal_pin) setTerminalPin(data.settings.terminal_pin);
          if (data.settings.company_name) setCompanyName(data.settings.company_name);
          if (data.settings.tolerance_default) setToleranceDefault(data.settings.tolerance_default);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminal_pin: terminalPin,
          company_name: companyName,
          tolerance_default: toleranceDefault,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMsg(data.error || "Erro ao salvar configurações");
      }
    } catch (err: any) {
      setErrorMsg("Erro na requisição: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6 text-zinc-100 font-sans">
      {/* Header */}
      <div className="pb-5 border-b border-[#22242e]">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
          <Settings className="w-3.5 h-3.5 text-zinc-400" />
          <span>SISTEMA & SEGURANÇA</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Configurações do Terminal de Ponto
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Altere a senha mestra para desbloqueio do relógio no smartphone/kiosk e parâmetros de tolerância.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>CONFIGURAÇÕES SALVAS COM SUCESSO</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-mono">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 font-mono text-xs">
        {/* Terminal Security Password */}
        <div className="bg-[#111216] border border-[#22242e] rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 font-bold text-white text-xs uppercase">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Senha do Relógio de Ponto (Rota Privada /relogio)</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Esta senha é solicitada obrigatoriamente para abrir a câmera e o sensor biométrico do relógio no celular ou tablet de parede.
          </p>

          <div className="max-w-xs pt-2">
            <label className="block text-[10px] uppercase text-zinc-500 font-bold mb-1.5">
              Senha Mestra do Terminal
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={terminalPin}
                onChange={(e) => setTerminalPin(e.target.value)}
                placeholder="1234"
                className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
            <span className="text-[10px] text-zinc-600 mt-1 block">
              Padrão inicial: 1234
            </span>
          </div>
        </div>

        {/* Company Settings */}
        <div className="bg-[#111216] border border-[#22242e] rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 font-bold text-white text-xs uppercase">
            <Building className="w-4 h-4 text-zinc-400" />
            <span>Parâmetros Operacionais</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-zinc-500 font-bold mb-1.5">
                Nome da Empresa / Local
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Gestão de Presença"
                className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-zinc-500 font-bold mb-1.5">
                Tolerância Padrão de Atraso (min)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={toleranceDefault}
                  onChange={(e) => setToleranceDefault(e.target.value)}
                  className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs uppercase rounded-xl shadow transition active:scale-95 flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
