"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  ArrowRight,
  Fingerprint,
  Camera,
  Calendar,
  Sparkles,
  ShieldCheck,
  Plus,
  Terminal,
} from "lucide-react";

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  dayOffToday: number;
  attendanceRate: number;
}

interface RecentPunch {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_department: string;
  employee_position: string;
  employee_photo?: string;
  timestamp: string;
  type: "entry" | "exit";
  verification_method: "face" | "fingerprint" | "pin";
  status: "on_time" | "late" | "early_exit" | "day_off_work" | "overtime";
  delay_minutes: number;
  photo_snapshot?: string;
}

interface EmployeeItem {
  id: number;
  name: string;
  department: string;
  position: string;
  photo_url?: string;
  start_time: string;
  end_time: string;
  weekly_day_off: string;
  current_status?: "present" | "absent" | "day_off";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    dayOffToday: 0,
    attendanceRate: 0,
  });
  const [recentPunches, setRecentPunches] = useState<RecentPunch[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [terminalPin, setTerminalPin] = useState("1234");
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, empRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/employees"),
      ]);
      const statsData = await statsRes.json();
      const empData = await empRes.json();

      if (statsData.success) {
        setStats(statsData.stats);
        setRecentPunches(statsData.recentPunches || []);
        if (statsData.terminalPin) setTerminalPin(statsData.terminalPin);
      }
      if (empData.success) {
        setEmployees(empData.employees || []);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6 text-zinc-100 font-sans">
      {/* Top Console Hardware Bar */}
      <div className="bg-[#111216] border border-[#22242e] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ESTAÇÃO BIOMÉTRICA DE CONTROLE • SQLITE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Painel de Presença & Ponto Eletrônico
          </h1>
          <p className="text-xs text-zinc-400 max-w-xl">
            Gestão de colaboradores, biometria facial, leitura digital em smartphone e monitoramento em tempo real.
          </p>
        </div>

        {/* Private Terminal Button */}
        <div className="shrink-0 flex flex-col sm:items-end gap-1.5">
          <Link
            href="/relogio"
            className="group flex items-center gap-3 px-5 py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-mono text-xs uppercase font-bold shadow-lg transition active:scale-95"
          >
            <Lock className="w-4 h-4 text-zinc-900" />
            <span>ABRIR RELÓGIO DE PONTO</span>
            <ArrowRight className="w-4 h-4 text-zinc-900 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <span className="font-mono text-[10px] text-zinc-500">
            ACESSO PRIVADO • SENHA: <span className="text-zinc-300 font-bold">{terminalPin}</span>
          </span>
        </div>
      </div>

      {/* KPI Cards (Clean, Modular Industrial Tiles) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Metric 1 */}
        <div className="bg-[#111216] border border-[#22242e] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
            <span>COLABORADORES</span>
            <Users className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-2">
            {stats.totalEmployees}
          </div>
          <div className="mt-2 pt-2 border-t border-[#1d1f27] text-[10px] text-zinc-500 flex justify-between">
            <span>Status</span>
            <span className="text-zinc-300 font-semibold">{stats.totalEmployees > 0 ? "Ativo" : "Sem registros"}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#111216] border border-[#22242e] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
            <span>PRESENTES HOJE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-2">
            {stats.presentToday}
          </div>
          <div className="mt-2 pt-2 border-t border-[#1d1f27] text-[10px] text-zinc-500 flex justify-between">
            <span>Taxa</span>
            <span className="text-emerald-400 font-semibold">{stats.attendanceRate}%</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#111216] border border-[#22242e] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
            <span>ATRASOS HOJE</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400 mt-2">
            {stats.lateToday}
          </div>
          <div className="mt-2 pt-2 border-t border-[#1d1f27] text-[10px] text-zinc-500 flex justify-between">
            <span>Tolerância</span>
            <span className="text-zinc-300 font-semibold">15 min</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#111216] border border-[#22242e] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
            <span>FOLGAS PREVISTAS</span>
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-400 mt-2">
            {stats.dayOffToday}
          </div>
          <div className="mt-2 pt-2 border-t border-[#1d1f27] text-[10px] text-zinc-500 flex justify-between">
            <span>Escala</span>
            <span className="text-zinc-300 font-semibold">Semanal</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Punches Table & Employee Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Punch Tape Feed */}
        <div className="lg:col-span-2 bg-[#111216] border border-[#22242e] rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#20222b]">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>REGISTROS EM TEMPO REAL (HOJE)</span>
            </div>
            <Link
              href="/relatorios"
              className="font-mono text-[11px] uppercase text-zinc-400 hover:text-white transition"
            >
              Ver todos →
            </Link>
          </div>

          <div className="mt-4 flex-1">
            {recentPunches.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-[#20222a] rounded-xl p-6 bg-[#0c0d10]">
                <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <div className="font-mono text-xs font-bold uppercase text-zinc-300">
                  Nenhuma batida registrada hoje
                </div>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Abra o <strong className="text-zinc-300">Relógio de Ponto</strong> no celular ou navegador para bater ponto por reconhecimento facial ou impressão digital.
                </p>
                <div className="mt-4">
                  <Link
                    href="/relogio"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1c24] hover:bg-[#252834] font-mono text-[11px] uppercase font-bold text-emerald-400 border border-[#2a2d3a] transition"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Iniciar Relógio de Ponto</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#20222a] text-zinc-500 uppercase text-[10px]">
                      <th className="py-2.5 px-2 font-bold">Colaborador</th>
                      <th className="py-2.5 px-2 font-bold">Hora</th>
                      <th className="py-2.5 px-2 font-bold">Tipo</th>
                      <th className="py-2.5 px-2 font-bold">Método</th>
                      <th className="py-2.5 px-2 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b1c23]">
                    {recentPunches.map((punch) => {
                      const time = new Date(punch.timestamp).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });

                      return (
                        <tr key={punch.id} className="hover:bg-[#16181f] transition">
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#1c1e27] border border-[#272935] shrink-0">
                                {punch.photo_snapshot || punch.employee_photo ? (
                                  <img
                                    src={punch.photo_snapshot || punch.employee_photo}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-zinc-400 text-[10px]">
                                    {punch.employee_name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <span className="font-bold text-white truncate max-w-[140px]">
                                {punch.employee_name}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-2 text-zinc-300">
                            {time}
                          </td>

                          <td className="py-2.5 px-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                punch.type === "entry"
                                  ? "bg-blue-950 text-blue-300 border border-blue-800"
                                  : "bg-amber-950 text-amber-300 border border-amber-800"
                              }`}
                            >
                              {punch.type === "entry" ? "Entrada" : "Saída"}
                            </span>
                          </td>

                          <td className="py-2.5 px-2 text-zinc-400">
                            {punch.verification_method === "face" ? (
                              <span className="flex items-center gap-1">
                                <Camera className="w-3 h-3 text-cyan-400" />
                                <span>Facial</span>
                              </span>
                            ) : punch.verification_method === "fingerprint" ? (
                              <span className="flex items-center gap-1">
                                <Fingerprint className="w-3 h-3 text-emerald-400" />
                                <span>Digital</span>
                              </span>
                            ) : (
                              <span>PIN</span>
                            )}
                          </td>

                          <td className="py-2.5 px-2 text-right">
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                punch.status === "on_time"
                                  ? "text-emerald-400 bg-emerald-950/60"
                                  : punch.status === "late"
                                  ? "text-rose-400 bg-rose-950/60"
                                  : punch.status === "day_off_work"
                                  ? "text-purple-400 bg-purple-950/60"
                                  : "text-zinc-400"
                              }`}
                            >
                              {punch.status === "on_time"
                                ? "No Horário"
                                : punch.status === "late"
                                ? `+${punch.delay_minutes}m`
                                : "Folga"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Registered Staff & Setup Status */}
        <div className="space-y-4">
          <div className="bg-[#111216] border border-[#22242e] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#20222b]">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-zinc-300">
                QUADRO DE COLABORADORES
              </span>
              <Link
                href="/funcionarios"
                className="font-mono text-[10px] uppercase text-zinc-400 hover:text-white"
              >
                + Cadastrar
              </Link>
            </div>

            <div className="mt-3">
              {employees.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="w-7 h-7 mx-auto mb-2 text-zinc-600" />
                  <p className="text-xs text-zinc-400 font-medium">Nenhum funcionário cadastrado.</p>
                  <Link
                    href="/funcionarios"
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 font-mono text-[11px] uppercase font-bold transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Cadastrar Primeiro Funcionário</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {employees.slice(0, 5).map((emp) => (
                    <div
                      key={emp.id}
                      className="p-2.5 bg-[#0c0d10] border border-[#1f2129] rounded-xl flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 truncate max-w-[160px]">
                        <div className="w-6 h-6 rounded bg-[#1c1e27] flex items-center justify-center font-bold text-[10px] text-zinc-300 shrink-0">
                          {emp.photo_url ? (
                            <img src={emp.photo_url} alt="" className="w-full h-full object-cover rounded" />
                          ) : (
                            emp.name.charAt(0)
                          )}
                        </div>
                        <span className="font-bold text-white truncate">{emp.name}</span>
                      </div>

                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          emp.current_status === "present"
                            ? "text-emerald-400 bg-emerald-950/80 border border-emerald-800"
                            : "text-zinc-500 bg-[#14151b]"
                        }`}
                      >
                        {emp.current_status === "present" ? "Presente" : "Ausente"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Hardware Instructions */}
          <div className="bg-[#111216] border border-[#22242e] rounded-2xl p-5 shadow-lg text-xs space-y-2">
            <div className="font-mono text-xs uppercase tracking-wider font-bold text-zinc-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span>INSTRUÇÕES DE INSTALAÇÃO</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Abra a rota <strong className="text-zinc-200 font-mono">/relogio</strong> no smartphone posicionado como terminal de parede. Após digitar a senha, o celular fica bloqueado no modo relógio com reconhecimento facial e sensor digital de toque contínuo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
