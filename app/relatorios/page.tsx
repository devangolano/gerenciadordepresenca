"use client";

import { useEffect, useState } from "react";
import {
  History,
  Download,
  Calendar,
  Filter,
  Camera,
  Fingerprint,
  Lock,
  Search,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface AttendanceRecord {
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
  notes?: string;
}

interface EmployeeItem {
  id: number;
  name: string;
}

export default function RelatoriosPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters - Defaults to today's date in client useEffect
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let url = "/api/attendance?limit=500";
      if (selectedDate) url += `&date=${selectedDate}`;
      if (selectedEmployee) url += `&employeeId=${selectedEmployee}`;

      const [recRes, empRes] = await Promise.all([
        fetch(url),
        fetch("/api/employees"),
      ]);

      const recData = await recRes.json();
      const empData = await empRes.json();

      if (recData.success) {
        setRecords(recData.records || []);
      }
      if (empData.success) {
        setEmployees(empData.employees || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedEmployee]);

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee_department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus ? r.status === selectedStatus : true;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = [
      "ID",
      "Colaborador",
      "Departamento",
      "Data e Hora",
      "Tipo",
      "Metodo",
      "Status",
      "Minutos Atraso",
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      `"${r.employee_name}"`,
      `"${r.employee_department}"`,
      r.timestamp,
      r.type === "entry" ? "Entrada" : "Saida",
      r.verification_method,
      r.status,
      r.delay_minutes || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `relatorio_ponto_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-5 text-zinc-100 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#22242e]">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span>AUDITORIA & REGISTROS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Histórico de Presenças & Logs
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Auditoria completa de batidas de ponto, horários, tolerâncias e exportação para folha de pagamento.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={filteredRecords.length === 0}
          className="bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-mono text-xs uppercase font-bold px-4 py-2.5 rounded-xl shadow transition active:scale-95 flex items-center gap-2 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>EXPORTAR CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#111216] border border-[#22242e] rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nome..."
            className="w-full bg-[#0d0e11] border border-[#22242e] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Date Filter */}
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-[#0d0e11] border border-[#22242e] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Employee Filter */}
        <div>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full bg-[#0d0e11] border border-[#22242e] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
          >
            <option value="">Todos os Colaboradores</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-[#0d0e11] border border-[#22242e] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
          >
            <option value="">Todos os Status</option>
            <option value="on_time">No Horário</option>
            <option value="late">Com Atraso</option>
            <option value="day_off_work">Dia de Folga</option>
            <option value="early_exit">Saída Antecipada</option>
            <option value="overtime">Hora Adicional</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111216] border border-[#22242e] rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 text-center font-mono text-xs text-zinc-500">CARREGANDO REGISTROS...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center font-mono text-xs text-zinc-500">
            NENHUM REGISTRO ENCONTRADO
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#20222a] bg-[#0c0d10] text-zinc-500 uppercase text-[10px]">
                  <th className="py-2.5 px-3 font-bold">Colaborador</th>
                  <th className="py-2.5 px-3 font-bold">Data & Hora</th>
                  <th className="py-2.5 px-3 font-bold">Tipo</th>
                  <th className="py-2.5 px-3 font-bold">Método</th>
                  <th className="py-2.5 px-3 font-bold">Status do Ponto</th>
                  <th className="py-2.5 px-3 font-bold text-right">Foto Verificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1c23]">
                {filteredRecords.map((record) => {
                  const dateObj = new Date(record.timestamp);
                  const dateStr = dateObj.toLocaleDateString("pt-BR");
                  const timeStr = dateObj.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <tr key={record.id} className="hover:bg-[#16181f] transition">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#1c1e27] border border-[#272935] shrink-0 flex items-center justify-center font-bold text-[10px] text-zinc-400">
                            {record.photo_snapshot || record.employee_photo ? (
                              <img
                                src={record.photo_snapshot || record.employee_photo}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              record.employee_name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">
                              {record.employee_name}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {record.employee_department}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-zinc-300">
                        <div>{dateStr}</div>
                        <div className="text-zinc-500 text-[10px]">{timeStr}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            record.type === "entry"
                              ? "bg-blue-950 text-blue-300 border border-blue-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}
                        >
                          {record.type === "entry" ? "Entrada" : "Saída"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-zinc-400">
                        {record.verification_method === "face" ? (
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3 text-cyan-400" />
                            <span>Face</span>
                          </span>
                        ) : record.verification_method === "fingerprint" ? (
                          <span className="flex items-center gap-1">
                            <Fingerprint className="w-3 h-3 text-emerald-400" />
                            <span>Digital</span>
                          </span>
                        ) : (
                          <span>PIN</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            record.status === "on_time"
                              ? "text-emerald-400 bg-emerald-950/60"
                              : record.status === "late"
                              ? "text-rose-400 bg-rose-950/60"
                              : record.status === "day_off_work"
                              ? "text-purple-400 bg-purple-950/60"
                              : "text-zinc-400"
                          }`}
                        >
                          {record.status === "on_time"
                            ? "No Horário"
                            : record.status === "late"
                            ? `Atraso (${record.delay_minutes}m)`
                            : record.status === "day_off_work"
                            ? "Em Folga"
                            : "Saída"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {record.photo_snapshot ? (
                          <img
                            src={record.photo_snapshot}
                            alt=""
                            className="w-7 h-7 rounded object-cover ml-auto border border-[#272935]"
                            title="Foto capturada"
                          />
                        ) : (
                          <span className="text-zinc-700 text-xs">—</span>
                        )}
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
  );
}
