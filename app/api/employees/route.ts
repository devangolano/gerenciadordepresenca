import { NextRequest, NextResponse } from "next/server";
import { getDb, Employee } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const employees = db
      .prepare(`
        SELECT * FROM employees 
        WHERE is_active = 1 
        ORDER BY name ASC
      `)
      .all() as Employee[];

    // For each employee, get today's punches
    const enriched = employees.map((emp) => {
      const todayPunches = db
        .prepare(`
          SELECT * FROM attendance_records 
          WHERE employee_id = ? AND date(timestamp) = date('now', 'localtime')
          ORDER BY timestamp ASC
        `)
        .all(emp.id);

      let currentStatus: "present" | "absent" | "day_off" = "absent";
      if (todayPunches.length > 0) {
        const lastPunch = todayPunches[todayPunches.length - 1] as any;
        currentStatus = lastPunch.type === "entry" ? "present" : "absent";
      }

      return {
        ...emp,
        today_punches: todayPunches,
        current_status: currentStatus,
      };
    });

    return NextResponse.json({ success: true, employees: enriched });
  } catch (error: any) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao buscar funcionários" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      document,
      email,
      phone,
      department,
      position,
      pin,
      photo_url,
      face_descriptor,
      fingerprint_id,
      work_schedule_type,
      work_days,
      weekly_day_off,
      start_time,
      end_time,
      break_start,
      break_end,
      tolerance_minutes,
    } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const db = getDb();
    const insertStmt = db.prepare(`
      INSERT INTO employees (
        name, document, email, phone, department, position, pin,
        photo_url, face_descriptor, fingerprint_id,
        work_schedule_type, work_days, weekly_day_off,
        start_time, end_time, break_start, break_end, tolerance_minutes
      ) VALUES (
        @name, @document, @email, @phone, @department, @position, @pin,
        @photo_url, @face_descriptor, @fingerprint_id,
        @work_schedule_type, @work_days, @weekly_day_off,
        @start_time, @end_time, @break_start, @break_end, @tolerance_minutes
      )
    `);

    const result = insertStmt.run({
      name: name.trim(),
      document: document || null,
      email: email || null,
      phone: phone || null,
      department: department || "Geral",
      position: position || "Colaborador",
      pin: pin || "1234",
      photo_url: photo_url || null,
      face_descriptor: face_descriptor || null,
      fingerprint_id: fingerprint_id || null,
      work_schedule_type: work_schedule_type || "mon_fri",
      work_days: typeof work_days === "string" ? work_days : JSON.stringify(work_days || [1, 2, 3, 4, 5]),
      weekly_day_off: weekly_day_off || "Sábado e Domingo",
      start_time: start_time || "08:00",
      end_time: end_time || "17:00",
      break_start: break_start || "12:00",
      break_end: break_end || "13:00",
      tolerance_minutes: Number(tolerance_minutes) || 15,
    });

    const created = db
      .prepare("SELECT * FROM employees WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json({ success: true, employee: created });
  } catch (error: any) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cadastrar funcionário" },
      { status: 500 }
    );
  }
}
