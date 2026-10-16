import { getDb, Employee, AttendanceRecord } from "./db";

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

export function registerAttendancePunch(params: {
  employeeId: number;
  verificationMethod: "face" | "fingerprint" | "pin";
  type?: "entry" | "exit";
  photoSnapshot?: string;
  notes?: string;
  confirmedExit?: boolean;
}): AttendanceResult {
  const db = getDb();

  // Find employee
  const employee = db
    .prepare("SELECT * FROM employees WHERE id = ? AND is_active = 1")
    .get(params.employeeId) as Employee | undefined;

  if (!employee) {
    return { success: false, message: "Funcionário não encontrado ou inativo." };
  }

  const now = new Date();

  // Query ALL punches for this employee today
  const todayPunches = db
    .prepare(
      `SELECT * FROM attendance_records 
       WHERE employee_id = ? AND date(timestamp) = date('now', 'localtime')
       ORDER BY timestamp ASC`
    )
    .all(employee.id) as AttendanceRecord[];

  // RULE: Maximum 2 punches per day (1 Entry, 1 Exit)
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

  // RULE: If employee already has 1 punch today, the 2nd punch MUST be Exit (Saída)
  // and MUST ask for confirmation if not explicitly confirmed yet!
  if (todayPunches.length === 1) {
    if (!params.confirmedExit) {
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
  }

  // Determine punch type:
  // - 0 punches today -> Entry (Entrada)
  // - 1 punch today -> Exit (Saída)
  const punchType: "entry" | "exit" = todayPunches.length === 0 ? "entry" : "exit";

  // Anti-double-punch check within 20 seconds
  if (todayPunches.length > 0) {
    const lastPunch = todayPunches[todayPunches.length - 1];
    const lastPunchTime = new Date(lastPunch.timestamp).getTime();
    const diffSeconds = (now.getTime() - lastPunchTime) / 1000;
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
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  let workDays: number[] = [1, 2, 3, 4, 5];
  try {
    if (employee.work_days) {
      workDays = JSON.parse(employee.work_days);
    }
  } catch {
    workDays = [1, 2, 3, 4, 5];
  }

  const isWorkDay = workDays.includes(dayOfWeek);

  // Time calculations
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let status: "on_time" | "late" | "early_exit" | "day_off_work" | "overtime" = "on_time";
  let delayMinutes = 0;
  let statusMessage = "";

  if (!isWorkDay) {
    status = "day_off_work";
    statusMessage = "Registro em dia de folga previsto.";
  } else if (punchType === "entry") {
    // Check start time and tolerance
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
    // Exit punch
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

  // Insert into database
  const insertStmt = db.prepare(`
    INSERT INTO attendance_records (
      employee_id, timestamp, type, verification_method, status, delay_minutes, photo_snapshot, notes
    ) VALUES (
      @employee_id, datetime('now', 'localtime'), @type, @verification_method, @status, @delay_minutes, @photo_snapshot, @notes
    )
  `);

  const info = insertStmt.run({
    employee_id: employee.id,
    type: punchType,
    verification_method: params.verificationMethod,
    status: status,
    delay_minutes: delayMinutes,
    photo_snapshot: params.photoSnapshot || null,
    notes: params.notes || null,
  });

  const savedRecord = db
    .prepare("SELECT * FROM attendance_records WHERE id = ?")
    .get(info.lastInsertRowid) as AttendanceRecord;

  return {
    success: true,
    message: statusMessage,
    record: savedRecord,
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
