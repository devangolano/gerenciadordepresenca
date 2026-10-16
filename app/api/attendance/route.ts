import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { registerAttendancePunch } from "@/lib/attendance";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    const limit = Number(searchParams.get("limit")) || 100;

    let query = supabase
      .from("attendance_records")
      .select("*, employees(name, department, photo_url)")
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte("timestamp", startOfDay).lte("timestamp", endOfDay);
    }

    if (employeeId) {
      query = query.eq("employee_id", Number(employeeId));
    }

    const { data: records, error } = await query;

    if (error) {
      if (error.code === "PGRST205") {
        return NextResponse.json({ success: true, records: [] });
      }
      throw error;
    }

    // Flatten employee details for UI compatibility
    const flattened = (records || []).map((r: any) => ({
      ...r,
      employee_name: r.employees?.name || "Colaborador",
      employee_department: r.employees?.department || "Geral",
      employee_photo: r.employees?.photo_url || null,
    }));

    return NextResponse.json({ success: true, records: flattened });
  } catch (error: any) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      employeeId,
      verificationMethod = "face",
      type,
      photoSnapshot,
      notes,
      pin,
      fingerprintId,
      confirmedExit,
    } = body;

    let targetEmployeeId = employeeId;

    // If no employeeId but PIN was sent
    if (!targetEmployeeId && pin) {
      const { data: match } = await supabase
        .from("employees")
        .select("id")
        .eq("pin", pin.trim())
        .eq("is_active", 1)
        .single();

      if (!match) {
        return NextResponse.json(
          { success: false, message: "PIN incorreto ou colaborador não encontrado." },
          { status: 404 }
        );
      }
      targetEmployeeId = match.id;
    }

    // If no employeeId but fingerprintId was sent
    if (!targetEmployeeId && fingerprintId) {
      const { data: match } = await supabase
        .from("employees")
        .select("id")
        .eq("fingerprint_id", fingerprintId)
        .eq("is_active", 1)
        .single();

      if (!match) {
        return NextResponse.json(
          { success: false, message: "Impressão digital não reconhecida no sistema." },
          { status: 404 }
        );
      }
      targetEmployeeId = match.id;
    }

    if (!targetEmployeeId) {
      return NextResponse.json(
        { success: false, message: "ID do funcionário não fornecido." },
        { status: 400 }
      );
    }

    const result = await registerAttendancePunch({
      employeeId: Number(targetEmployeeId),
      verificationMethod: verificationMethod as "face" | "fingerprint" | "pin",
      type: type || undefined,
      photoSnapshot,
      notes,
      confirmedExit: Boolean(confirmedExit),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error creating attendance:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro ao registrar ponto" },
      { status: 500 }
    );
  }
}
