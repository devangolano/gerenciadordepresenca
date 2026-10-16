import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Employee } from "@/lib/db";

export async function GET() {
  try {
    const { data: employees, error } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", 1)
      .order("name", { ascending: true });

    if (error) {
      // If table does not exist yet
      if (error.code === "PGRST205") {
        return NextResponse.json({
          success: true,
          employees: [],
          needsTableSetup: true,
          message: "Tabelas ainda não criadas no Supabase. Execute o script supabase_schema.sql no SQL Editor do Supabase.",
        });
      }
      throw error;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch today's punches for all employees
    const { data: todayPunches } = await supabase
      .from("attendance_records")
      .select("*")
      .gte("timestamp", startOfDay.toISOString())
      .lte("timestamp", endOfDay.toISOString())
      .order("timestamp", { ascending: true });

    const enriched = (employees || []).map((emp: Employee) => {
      const empTodayPunches = (todayPunches || []).filter(
        (p: any) => p.employee_id === emp.id
      );

      let currentStatus: "present" | "absent" | "day_off" = "absent";
      if (empTodayPunches.length > 0) {
        const lastPunch = empTodayPunches[empTodayPunches.length - 1];
        currentStatus = lastPunch.type === "entry" ? "present" : "absent";
      }

      return {
        ...emp,
        today_punches: empTodayPunches,
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

    const newEmployee = {
      name: name.trim(),
      document: document || null,
      email: email || null,
      phone: phone || null,
      department: department || "Operações",
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
      is_active: 1,
    };

    const { data: created, error } = await supabase
      .from("employees")
      .insert(newEmployee)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST205") {
        return NextResponse.json(
          {
            success: false,
            error: "Tabelas ainda não existem no Supabase. Por favor, execute o script 'supabase_schema.sql' no SQL Editor do seu projeto Supabase.",
          },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, employee: created });
  } catch (error: any) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cadastrar funcionário" },
      { status: 500 }
    );
  }
}
