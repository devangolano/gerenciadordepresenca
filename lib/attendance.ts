import { supabase } from "./supabase";
import { Employee, AttendanceRecord } from "./db";

export interface AttendanceResult {
  success: boolean;
  message: string;
  record?: AttendanceRecord;
  employee?: {
    id: number;
    name: string;
    department: string;
    position: string;
    photo_url?: string;
  };
  punchType?: "entry" | "exit";
  delayMinutes?: number;
  status?: string;
  requiresExitConfirmation?: boolean;
  firstPunchTime?: string;
  code?: string;
}

export async function registerAttendancePunch(params: {
  employeeId: number;
  verificationMethod: "face" | "fingerprint" | "pin";
  type?: "entry" | "exit";
  photoSnapshot?: string;
  notes?: string;
  confirmedExit?: boolean;
}): Promise<AttendanceResult> {
  // 1. Fetch employee
  const { data: employee, error: empErr } = await supabase
    .from("employees")
    .select("*")
    .eq("id", params.employeeId)
    .eq("is_active", 1)
    .single();

  if (empErr || !employee) {
    return { success: false, message: "Funcionário não encontrado ou inativo." };
  }

  const now = new Date();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // 2. Query today's punches
  const { data: todayRecords } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employee.id)
    .gte("timestamp", startOfDay.toISOString())
    .lte("timestamp", endOfDay.toISOString())
    .order("timestamp", { ascending: true });

  const todayPunches = (todayRecords || []) as AttendanceRecord[];

  // RULE 1: Daily limit (maximum 2 punches per day)
  if (todayPunches.length >= 2) {
    return {
      success: false,
      code: "DAILY_LIMIT_REACHED",
      message: `Limite diário atingido: O colaborador ${employee.name} já registrou as 2 batidas diárias permitidas hoje (Entrada e Saída).`,
      employee: {
        id: employee.id,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        photo_url: employee.photo_url,
      },
    };
  }

  // RULE 2: If 1 punch exists, 2nd punch requires exit confirmation
  if (todayPunches.length === 1 && !params.confirmedExit) {
    const firstPunch = todayPunches[0];
    const firstTime = new Date(firstPunch.timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      success: false,
      requiresExitConfirmation: true,
      firstPunchTime: firstTime,
      message: `Segunda batida do dia. Confirmar encerramento do expediente e saída de ${employee.name}?`,
      employee: {
        id: employee.id,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        photo_url: employee.photo_url,
      },
    };
  }

  // Determine punch type: 1st is entry, 2nd is exit
  const punchType: "entry" | "exit" = todayPunches.length === 0 ? "entry" : "exit";

  // Anti-double-punch check within 20s
  if (todayPunches.length > 0) {
    const lastPunch = todayPunches[todayPunches.length - 1];
    const diffSeconds = (now.getTime() - new Date(lastPunch.timestamp).getTime()) / 1000;
    if (diffSeconds < 20) {
      return {
        success: true,
        message: `Ponto já registrado há ${Math.round(diffSeconds)} segundos!`,
        record: lastPunch,
        employee: {
          id: employee.id,
          name: employee.name,
          department: employee.department,
          position: employee.position,
          photo_url: employee.photo_url,
        },
        punchType: lastPunch.type === "exit" ? "exit" : "entry",
        status: lastPunch.status,
      };
    }
  }

  // Calculate day of week and work schedule
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  let workDays: number[] = [1, 2, 3, 4, 5];
  try {
    if (employee.work_days) {
      workDays = JSON.parse(employee.work_days);
    }
  } catch {
    workDays = [1, 2, 3, 4, 5];
  }

  const isWorkDay = workDays.includes(dayOfWeek);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let status: "on_time" | "late" | "early_exit" | "day_off_work" | "overtime" = "on_time";
  let delayMinutes = 0;
  let statusMessage = "";

  if (!isWorkDay) {
    status = "day_off_work";
    statusMessage = "Registro em dia de folga previsto.";
  } else if (punchType === "entry") {
    const [startH, startM] = (employee.start_time || "08:00").split(":").map(Number);
    const scheduledStartMinutes = startH * 60 + startM;
    const tolerance = Number(employee.tolerance_minutes) || 15;
    const maxOnTimeMinutes = scheduledStartMinutes + tolerance;

    if (currentMinutes > maxOnTimeMinutes) {
      status = "late";
      delayMinutes = currentMinutes - scheduledStartMinutes;
      statusMessage = `Entrada com atraso de ${delayMinutes} min (Previsto: ${employee.start_time})`;
    } else {
      status = "on_time";
      statusMessage = `Entrada registrada no horário com sucesso!`;
    }
  } else {
    const [endH, endM] = (employee.end_time || "17:00").split(":").map(Number);
    const scheduledEndMinutes = endH * 60 + endM;
    const tolerance = Number(employee.tolerance_minutes) || 15;

    if (currentMinutes < scheduledEndMinutes - tolerance) {
      status = "early_exit";
      const earlyDiff = scheduledEndMinutes - currentMinutes;
      statusMessage = `Saída antecipada em ${earlyDiff} min (Previsto: ${employee.end_time})`;
    } else if (currentMinutes > scheduledEndMinutes + 45) {
      status = "overtime";
      statusMessage = `Saída registrada com horas adicionais!`;
    } else {
      status = "on_time";
      statusMessage = `Saída registrada com sucesso!`;
    }
  }

  // Insert into Supabase
  const { data: savedRecord, error: insertErr } = await supabase
    .from("attendance_records")
    .insert({
      employee_id: employee.id,
      timestamp: now.toISOString(),
      type: punchType,
      verification_method: params.verificationMethod,
      status: status,
      delay_minutes: delayMinutes,
      photo_snapshot: params.photoSnapshot || null,
      notes: params.notes || null,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Supabase insert error:", insertErr);
    return {
      success: false,
      message: "Erro ao gravar ponto no banco: " + insertErr.message,
    };
  }

  return {
    success: true,
    message: statusMessage,
    record: savedRecord as AttendanceRecord,
    employee: {
      id: employee.id,
      name: employee.name,
      department: employee.department,
      position: employee.position,
      photo_url: employee.photo_url,
    },
    punchType: punchType,
    delayMinutes: delayMinutes,
    status: status,
  };
}
