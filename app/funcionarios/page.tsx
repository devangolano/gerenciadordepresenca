"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Camera,
  Fingerprint,
  Calendar,
  Clock,
  Briefcase,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  X,
  Shield,
  KeyRound,
  LayoutGrid,
  Table as TableIcon,
  Filter,
  Check,
} from "lucide-react";
import FaceCaptureModal from "@/components/FaceCaptureModal";
import FingerprintCaptureModal from "@/components/FingerprintCaptureModal";

interface EmployeeItem {
  id: number;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  department: string;
  position: string;
  pin?: string;
  photo_url?: string;
  face_descriptor?: string;
  fingerprint_id?: string;
  work_schedule_type: string;
  work_days: string;
  weekly_day_off: string;
  start_time: string;
  end_time: string;
  tolerance_minutes: number;
  is_active: number;
}

export default function FuncionariosPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedBiometricFilter, setSelectedBiometricFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);

  // Biometrics Modals
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isFingerModalOpen, setIsFingerModalOpen] = useState(false);
  const [biometricTargetEmployee, setBiometricTargetEmployee] = useState<{ id?: number; name: string } | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    department: "Operações",
    position: "",
    pin: "1234",
    photo_url: "",
    face_descriptor: "",
    fingerprint_id: "",
    work_schedule_type: "mon_fri",
    work_days: [1, 2, 3, 4, 5],
    weekly_day_off: "Sábado e Domingo",
    start_time: "08:00",
    end_time: "17:00",
    tolerance_minutes: 15,
  });

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Erro ao buscar funcionários:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openNewForm = () => {
    setEditingEmployee(null);
    setFormData({
      name: "",
      document: "",
      email: "",
      phone: "",
      department: "Operações",
      position: "",
      pin: "1234",
      photo_url: "",
      face_descriptor: "",
      fingerprint_id: "",
      work_schedule_type: "mon_fri",
      work_days: [1, 2, 3, 4, 5],
      weekly_day_off: "Sábado e Domingo",
      start_time: "08:00",
      end_time: "17:00",
      tolerance_minutes: 15,
    });
    setIsFormOpen(true);
  };

  const openEditForm = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    let parsedWorkDays = [1, 2, 3, 4, 5];
    try {
      if (emp.work_days) parsedWorkDays = JSON.parse(emp.work_days);
    } catch {}

    setFormData({
      name: emp.name,
      document: emp.document || "",
      email: emp.email || "",
      phone: emp.phone || "",
      department: emp.department || "Operações",
      position: emp.position || "",
      pin: emp.pin || "1234",
      photo_url: emp.photo_url || "",
      face_descriptor: emp.face_descriptor || "",
      fingerprint_id: emp.fingerprint_id || "",
      work_schedule_type: emp.work_schedule_type || "mon_fri",
      work_days: parsedWorkDays,
      weekly_day_off: emp.weekly_day_off || "Sábado e Domingo",
      start_time: emp.start_time || "08:00",
      end_time: emp.end_time || "17:00",
      tolerance_minutes: emp.tolerance_minutes || 15,
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : "/api/employees";
      const method = editingEmployee ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setIsFormOpen(false);
        fetchEmployees();
      } else {
        alert(data.error || "Erro ao salvar colaborador");
      }
    } catch (err: any) {
      alert("Erro na requisição: " + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja desativar este colaborador do sistema?")) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchEmployees();
      }
    } catch (err: any) {
      alert("Erro ao remover: " + err.message);
    }
  };

  const handleSchedulePresetChange = (preset: string) => {
    if (preset === "mon_fri") {
      setFormData((prev) => ({
        ...prev,
        work_schedule_type: preset,
        work_days: [1, 2, 3, 4, 5],
        weekly_day_off: "Sábado e Domingo",
      }));
    } else if (preset === "mon_sat") {
      setFormData((prev) => ({
        ...prev,
        work_schedule_type: preset,
        work_days: [1, 2, 3, 4, 5, 6],
        weekly_day_off: "Domingo",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        work_schedule_type: preset,
      }));
    }
  };

  const toggleWorkDay = (dayNum: number) => {
    setFormData((prev) => {
      const exists = prev.work_days.includes(dayNum);
      const updated = exists
        ? prev.work_days.filter((d) => d !== dayNum)
        : [...prev.work_days, dayNum].sort();
      return { ...prev, work_days: updated };
    });
  };

  const openDirectFaceCapture = (emp: EmployeeItem) => {
    setBiometricTargetEmployee({ id: emp.id, name: emp.name });
    setIsFaceModalOpen(true);
  };

  const openDirectFingerprintCapture = (emp: EmployeeItem) => {
    setBiometricTargetEmployee({ id: emp.id, name: emp.name });
    setIsFingerModalOpen(true);
  };

  const handleFaceCaptured = async (faceData: { photoUrl: string; faceDescriptor: number[] }) => {
    if (isFormOpen) {
      setFormData((prev) => ({
        ...prev,
        photo_url: faceData.photoUrl,
        face_descriptor: JSON.stringify(faceData.faceDescriptor),
      }));
    } else if (biometricTargetEmployee?.id) {
      try {
        await fetch(`/api/employees/${biometricTargetEmployee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photo_url: faceData.photoUrl,
            face_descriptor: JSON.stringify(faceData.faceDescriptor),
          }),
        });
        fetchEmployees();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFingerprintCaptured = async (fingerprintId: string) => {
    if (isFormOpen) {
      setFormData((prev) => ({
        ...prev,
        fingerprint_id: fingerprintId,
      }));
    } else if (biometricTargetEmployee?.id) {
      try {
        await fetch(`/api/employees/${biometricTargetEmployee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fingerprint_id: fingerprintId,
          }),
        });
        fetchEmployees();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const weekDayNames = [
    { num: 1, label: "Seg" },
    { num: 2, label: "Ter" },
    { num: 3, label: "Qua" },
    { num: 4, label: "Qui" },
    { num: 5, label: "Sex" },
    { num: 6, label: "Sáb" },
    { num: 0, label: "Dom" },
  ];

  // Distinct departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch =
        search === "" ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.document?.toLowerCase().includes(search.toLowerCase()) ||
        e.position?.toLowerCase().includes(search.toLowerCase()) ||
        e.department?.toLowerCase().includes(search.toLowerCase());

      const matchDept =
        selectedDepartment === "all" || e.department === selectedDepartment;

      const matchBio =
        selectedBiometricFilter === "all" ||
        (selectedBiometricFilter === "complete" && !!e.face_descriptor && !!e.fingerprint_id) ||
        (selectedBiometricFilter === "missing_face" && !e.face_descriptor) ||
        (selectedBiometricFilter === "missing_finger" && !e.fingerprint_id);

      return matchSearch && matchDept && matchBio;
    });
  }, [employees, search, selectedDepartment, selectedBiometricFilter]);

  // Statistics
  const statsFaceCount = employees.filter((e) => !!e.face_descriptor).length;
  const statsFingerCount = employees.filter((e) => !!e.fingerprint_id).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6 text-zinc-100 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#22242e]">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span>DIRETÓRIO PROFISSIONAL</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Quadro Geral de Colaboradores
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Cadastro oficial, mapeamento biométrico facial, digital e configuração de jornadas de trabalho.
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="bg-zinc-100 hover:bg-white text-zinc-950 font-mono text-xs uppercase font-bold px-4 py-2.5 rounded-xl shadow transition active:scale-95 flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>CADASTRAR COLABORADOR</span>
        </button>
      </div>

      {/* Directory Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div className="bg-[#111216] border border-[#22242e] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Total no Quadro</div>
            <div className="text-xl font-bold text-white mt-0.5">{employees.length}</div>
          </div>
          <Users className="w-4 h-4 text-zinc-500" />
        </div>

        <div className="bg-[#111216] border border-[#22242e] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Biometria Facial</div>
            <div className="text-xl font-bold text-cyan-400 mt-0.5">
              {statsFaceCount} <span className="text-xs font-normal text-zinc-500">/ {employees.length}</span>
            </div>
          </div>
          <Camera className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="bg-[#111216] border border-[#22242e] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Biometria Digital</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">
              {statsFingerCount} <span className="text-xs font-normal text-zinc-500">/ {employees.length}</span>
            </div>
          </div>
          <Fingerprint className="w-4 h-4 text-emerald-400" />
        </div>

        <div className="bg-[#111216] border border-[#22242e] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Escalas Configuradas</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {employees.length > 0 ? "100%" : "0%"}
            </div>
          </div>
          <Clock className="w-4 h-4 text-zinc-400" />
        </div>
      </div>

      {/* Search & Filtering Toolbar */}
      <div className="bg-[#111216] border border-[#22242e] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, BI ou cargo..."
              className="w-full bg-[#0d0e11] border border-[#22242e] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-[#0d0e11] border border-[#22242e] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todos os Departamentos</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Biometric Status Filter */}
          <div>
            <select
              value={selectedBiometricFilter}
              onChange={(e) => setSelectedBiometricFilter(e.target.value)}
              className="bg-[#0d0e11] border border-[#22242e] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todas as Biometrias</option>
              <option value="complete">Biometria Completa (Face + Digital)</option>
              <option value="missing_face">Pendente de Face</option>
              <option value="missing_finger">Pendente de Digital</option>
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 shrink-0 border border-[#22242e] rounded-lg p-0.5 bg-[#0d0e11]">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded flex items-center gap-1 text-[11px] font-bold uppercase transition ${
              viewMode === "table" ? "bg-zinc-200 text-zinc-950" : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Visualização em Tabela"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tabela</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded flex items-center gap-1 text-[11px] font-bold uppercase transition ${
              viewMode === "grid" ? "bg-zinc-200 text-zinc-950" : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Visualização em Cartões"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grade</span>
          </button>
        </div>
      </div>

      {/* Directory Content */}
      <div>
        {isLoading ? (
          <div className="py-20 text-center font-mono text-xs text-zinc-500">CARREGANDO COLABORADORES...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#20222a] rounded-2xl bg-[#0c0d10] p-6">
            <Users className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
            <div className="font-mono text-xs uppercase font-bold text-zinc-300">
              Nenhum colaborador encontrado
            </div>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
              {employees.length === 0
                ? "O cadastro está vazio. Clique em CADASTRAR COLABORADOR para começar."
                : "Nenhum colaborador corresponde aos filtros de busca selecionados."}
            </p>
          </div>
        ) : viewMode === "table" ? (
          /* High-Density Enterprise Directory Table */
          <div className="bg-[#111216] border border-[#22242e] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#20222a] bg-[#0c0d10] text-zinc-500 uppercase text-[10px]">
                    <th className="py-3 px-4 font-bold">Colaborador</th>
                    <th className="py-3 px-3 font-bold">Departamento & Cargo</th>
                    <th className="py-3 px-3 font-bold">Jornada de Trabalho</th>
                    <th className="py-3 px-3 font-bold">Folga Semanal</th>
                    <th className="py-3 px-3 font-bold text-center">Face</th>
                    <th className="py-3 px-3 font-bold text-center">Digital</th>
                    <th className="py-3 px-3 font-bold">PIN</th>
                    <th className="py-3 px-4 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1c23]">
                  {filteredEmployees.map((emp) => {
                    const hasFace = !!emp.face_descriptor;
                    const hasFingerprint = !!emp.fingerprint_id;
                    let workDaysArray: number[] = [];
                    try {
                      if (emp.work_days) workDaysArray = JSON.parse(emp.work_days);
                    } catch {}

                    return (
                      <tr key={emp.id} className="hover:bg-[#16181f] transition">
                        {/* Employee Avatar & Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#1c1e27] border border-[#272935] shrink-0 flex items-center justify-center font-bold text-xs text-zinc-300">
                              {emp.photo_url ? (
                                <img src={emp.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                emp.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs">{emp.name}</div>
                              <div className="text-[10px] text-zinc-500">{emp.document || "SEM DOCUMENTO"}</div>
                            </div>
                          </div>
                        </td>

                        {/* Dept & Role */}
                        <td className="py-3 px-3">
                          <div className="text-zinc-200 font-bold">{emp.position || "Colaborador"}</div>
                          <span className="text-[10px] text-zinc-500">{emp.department}</span>
                        </td>

                        {/* Schedule & Days */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-zinc-200">
                            {emp.start_time} - {emp.end_time}
                          </div>
                          <div className="flex items-center gap-0.5 mt-1">
                            {weekDayNames.map((d) => {
                              const isWork = workDaysArray.includes(d.num);
                              return (
                                <span
                                  key={d.num}
                                  className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center ${
                                    isWork ? "bg-zinc-200 text-zinc-950" : "bg-[#16171d] text-zinc-600"
                                  }`}
                                  title={`${d.label}: ${isWork ? "Trabalho" : "Folga"}`}
                                >
                                  {d.label.charAt(0)}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Day off */}
                        <td className="py-3 px-3 text-zinc-400 text-[11px]">
                          {emp.weekly_day_off || "Domingo"}
                        </td>

                        {/* Face Status */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => openDirectFaceCapture(emp)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border transition ${
                              hasFace
                                ? "bg-cyan-950/70 text-cyan-400 border-cyan-800 hover:bg-cyan-900/60"
                                : "bg-[#181920] text-zinc-500 border-[#262833] hover:text-white"
                            }`}
                            title={hasFace ? "Face cadastrada (clique para atualizar)" : "Clique para cadastrar face"}
                          >
                            <Camera className="w-3 h-3" />
                            <span>{hasFace ? "Ativa" : "+ Face"}</span>
                          </button>
                        </td>

                        {/* Fingerprint Status */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => openDirectFingerprintCapture(emp)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border transition ${
                              hasFingerprint
                                ? "bg-emerald-950/70 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60"
                                : "bg-[#181920] text-zinc-500 border-[#262833] hover:text-white"
                            }`}
                            title={hasFingerprint ? "Digital cadastrada (clique para atualizar)" : "Clique para cadastrar digital"}
                          >
                            <Fingerprint className="w-3 h-3" />
                            <span>{hasFingerprint ? "Ativa" : "+ Digital"}</span>
                          </button>
                        </td>

                        {/* PIN */}
                        <td className="py-3 px-3 text-zinc-400 font-bold">
                          {emp.pin || "1234"}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditForm(emp)}
                              className="p-1 rounded text-zinc-500 hover:text-white hover:bg-[#20222a] transition"
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(emp.id)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                              title="Desativar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid View Option */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
            {filteredEmployees.map((emp) => {
              const hasFace = !!emp.face_descriptor;
              const hasFingerprint = !!emp.fingerprint_id;
              let workDaysArray: number[] = [];
              try {
                if (emp.work_days) workDaysArray = JSON.parse(emp.work_days);
              } catch {}

              return (
                <div
                  key={emp.id}
                  className="bg-[#111216] border border-[#22242e] rounded-2xl p-4 flex flex-col justify-between shadow-lg hover:border-[#2e313d] transition"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#181920] border border-[#272935] shrink-0 flex items-center justify-center font-bold text-sm text-zinc-300">
                        {emp.photo_url ? (
                          <img src={emp.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          emp.name.charAt(0)
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">{emp.name}</h3>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-sans">
                          {emp.position || "Colaborador"} • {emp.department}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          DOC: <span className="text-zinc-300">{emp.document || "—"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1d1f27] text-[10px]">
                      <button
                        onClick={() => openDirectFaceCapture(emp)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition uppercase font-semibold ${
                          hasFace
                            ? "bg-cyan-950/80 text-cyan-400 border-cyan-800"
                            : "bg-[#181920] text-zinc-500 border-[#262833]"
                        }`}
                      >
                        <Camera className="w-3 h-3" />
                        <span>{hasFace ? "Face Ativa" : "+ Face"}</span>
                      </button>

                      <button
                        onClick={() => openDirectFingerprintCapture(emp)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition uppercase font-semibold ${
                          hasFingerprint
                            ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                            : "bg-[#181920] text-zinc-500 border-[#262833]"
                        }`}
                      >
                        <Fingerprint className="w-3 h-3" />
                        <span>{hasFingerprint ? "Digital Ativa" : "+ Digital"}</span>
                      </button>
                    </div>

                    <div className="mt-3 bg-[#0c0d10] rounded-xl p-2.5 border border-[#1d1f27] text-[11px]">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="font-bold">
                          {emp.start_time} - {emp.end_time}
                        </span>
                        <span className="text-zinc-500 text-[10px]">Tol: {emp.tolerance_minutes}m</span>
                      </div>

                      <div className="flex items-center gap-1 mt-2">
                        {weekDayNames.map((d) => {
                          const isWork = workDaysArray.includes(d.num);
                          return (
                            <span
                              key={d.num}
                              className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${
                                isWork ? "bg-zinc-200 text-zinc-950" : "bg-[#16171d] text-zinc-600"
                              }`}
                            >
                              {d.label}
                            </span>
                          );
                        })}
                      </div>

                      <div className="mt-1.5 text-[10px] text-zinc-500">
                        Folga: <span className="text-zinc-300">{emp.weekly_day_off || "Domingo"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1d1f27] text-[10px]">
                    <span className="text-zinc-500">
                      PIN: <span className="text-zinc-300 font-bold">{emp.pin || "1234"}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditForm(emp)}
                        className="p-1 rounded text-zinc-500 hover:text-white transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Employee */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#121316] border border-[#272930] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col font-mono text-zinc-100">
            <div className="flex items-center justify-between p-4 border-b border-[#212329] sticky top-0 bg-[#121316] z-10">
              <span className="text-xs uppercase tracking-wider font-bold text-zinc-200">
                {editingEmployee ? "Editar Cadastro de Colaborador" : "Cadastrar Novo Colaborador"}
              </span>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg hover:bg-[#202228] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-5 text-xs">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                  1. Dados do Colaborador
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      NOME COMPLETO *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Carlos Silva"
                      className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      DOCUMENTO (BI / CPF)
                    </label>
                    <input
                      type="text"
                      value={formData.document}
                      onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                      placeholder="004812394LA042"
                      className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      PIN PESSOAL (4 DÍGITOS)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                      placeholder="1234"
                      className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      DEPARTAMENTO
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Ex: Operações"
                      className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      CARGO / FUNÇÃO
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="Ex: Supervisor"
                      className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1f2129]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                  2. Escala de Trabalho e Folgas
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3 font-mono">
                  <button
                    type="button"
                    onClick={() => handleSchedulePresetChange("mon_fri")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold border transition ${
                      formData.work_schedule_type === "mon_fri"
                        ? "bg-zinc-200 text-zinc-950 border-white"
                        : "bg-[#0d0e11] text-zinc-500 border-[#22242e]"
                    }`}
                  >
                    Seg a Sex (Folga: Sáb e Dom)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSchedulePresetChange("mon_sat")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold border transition ${
                      formData.work_schedule_type === "mon_sat"
                        ? "bg-zinc-200 text-zinc-950 border-white"
                        : "bg-[#0d0e11] text-zinc-500 border-[#22242e]"
                    }`}
                  >
                    Seg a Sáb (Folga: Dom)
                  </button>
                </div>

                <div className="mb-3">
                  <div className="text-[10px] text-zinc-400 mb-1.5 uppercase font-mono">
                    Dias Trabalhados:
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {weekDayNames.map((d) => {
                      const isSelected = formData.work_days.includes(d.num);
                      return (
                        <button
                          key={d.num}
                          type="button"
                          onClick={() => toggleWorkDay(d.num)}
                          className={`w-8 h-7 rounded-lg text-[10px] font-mono font-bold uppercase border transition ${
                            isSelected
                              ? "bg-zinc-200 text-zinc-950 border-white"
                              : "bg-[#0d0e11] text-zinc-600 border-[#22242e]"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      ENTRADA
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      SAÍDA
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      TOLERÂNCIA (MIN)
                    </label>
                    <input
                      type="number"
                      value={formData.tolerance_minutes}
                      onChange={(e) =>
                        setFormData({ ...formData, tolerance_minutes: Number(e.target.value) })
                      }
                      className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>
                </div>

                <div className="mt-2.5">
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                    DESCRIÇÃO DA FOLGA SEMANAL
                  </label>
                  <input
                    type="text"
                    value={formData.weekly_day_off}
                    onChange={(e) => setFormData({ ...formData, weekly_day_off: e.target.value })}
                    placeholder="Ex: Sábado e Domingo"
                    className="w-full bg-[#0d0e11] border border-[#22242e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1f2129]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                  3. Biometria Integrada
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#0d0e11] p-3 rounded-xl border border-[#22242e] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-zinc-200">Biometria Facial</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {formData.face_descriptor ? (
                          <span className="text-cyan-400 font-bold">Mapeada (128 pts)</span>
                        ) : (
                          "Não configurada"
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFaceModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#1a1c24] hover:bg-[#252834] text-zinc-200 text-[10px] font-bold uppercase border border-[#2b2e3c]"
                    >
                      {formData.face_descriptor ? "Refazer Face" : "Capturar"}
                    </button>
                  </div>

                  <div className="bg-[#0d0e11] p-3 rounded-xl border border-[#22242e] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-zinc-200">Impressão Digital</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {formData.fingerprint_id ? (
                          <span className="text-emerald-400 font-bold">Registrada</span>
                        ) : (
                          "Não configurada"
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBiometricTargetEmployee({ name: formData.name || "Novo Colaborador" });
                        setIsFingerModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#1a1c24] hover:bg-[#252834] text-zinc-200 text-[10px] font-bold uppercase border border-[#2b2e3c]"
                    >
                      {formData.fingerprint_id ? "Refazer" : "Mapear"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1f2129] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase text-zinc-500 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase text-zinc-950 bg-zinc-100 hover:bg-white shadow transition"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Biometrics Modals */}
      <FaceCaptureModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        onFaceCaptured={handleFaceCaptured}
      />

      <FingerprintCaptureModal
        isOpen={isFingerModalOpen}
        onClose={() => setIsFingerModalOpen(false)}
        employeeName={biometricTargetEmployee?.name || formData.name || "Colaborador"}
        onFingerprintCaptured={handleFingerprintCaptured}
      />
    </div>
  );
}
