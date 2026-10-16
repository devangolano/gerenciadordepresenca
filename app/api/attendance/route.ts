import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { registerAttendancePunch } from "@/lib/attendance";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    const limit = Number(searchParams.get("limit")) || 100;

    const db = getDb();

    let query = `
      SELECT 
        a.*,
        e.name as employee_name,
        e.department as employee_department,
        e.photo_url as employee_photo
      FROM attendance_records a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      query += " AND date(a.timestamp) = date(?)";
      params.push(date);
    }

    if (employeeId) {
      query += " AND a.employee_id = ?";
      params.push(Number(employeeId));
    }

    query += " ORDER BY a.timestamp DESC LIMIT ?";
    params.push(limit);

    const records = db.prepare(query).all(...params);

    return NextResponse.json({ success: true, records });
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

    const db = getDb();
    let targetEmployeeId = employeeId;

    // If no employeeId but PIN was sent
    if (!targetEmployeeId && pin) {
      const match = db
        .prepare("SELECT id FROM employees WHERE pin = ? AND is_active = 1")
        .get(pin.trim()) as { id: number } | undefined;

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
      const match = db
        .prepare("SELECT id FROM employees WHERE fingerprint_id = ? AND is_active = 1")
        .get(fingerprintId) as { id: number } | undefined;

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

    const result = registerAttendancePunch({
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
