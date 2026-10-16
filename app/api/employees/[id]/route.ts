import { NextRequest, NextResponse } from "next/server";
import { getDb, Employee } from "@/lib/db";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const employee = db
      .prepare("SELECT * FROM employees WHERE id = ?")
      .get(id) as Employee | undefined;

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Funcionário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const db = getDb();

    const existing = db
      .prepare("SELECT * FROM employees WHERE id = ?")
      .get(id) as Employee | undefined;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Funcionário não encontrado" },
        { status: 404 }
      );
    }

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
      is_active,
    } = body;

    const updateStmt = db.prepare(`
      UPDATE employees SET
        name = @name,
        document = @document,
        email = @email,
        phone = @phone,
        department = @department,
        position = @position,
        pin = @pin,
        photo_url = coalesce(@photo_url, photo_url),
        face_descriptor = coalesce(@face_descriptor, face_descriptor),
        fingerprint_id = coalesce(@fingerprint_id, fingerprint_id),
        work_schedule_type = @work_schedule_type,
        work_days = @work_days,
        weekly_day_off = @weekly_day_off,
        start_time = @start_time,
        end_time = @end_time,
        break_start = @break_start,
        break_end = @break_end,
        tolerance_minutes = @tolerance_minutes,
        is_active = @is_active
      WHERE id = @id
    `);

    updateStmt.run({
      id: Number(id),
      name: name ?? existing.name,
      document: document !== undefined ? document : existing.document,
      email: email !== undefined ? email : existing.email,
      phone: phone !== undefined ? phone : existing.phone,
      department: department ?? existing.department,
      position: position ?? existing.position,
      pin: pin ?? existing.pin,
      photo_url: photo_url !== undefined ? photo_url : null,
      face_descriptor: face_descriptor !== undefined ? face_descriptor : null,
      fingerprint_id: fingerprint_id !== undefined ? fingerprint_id : null,
      work_schedule_type: work_schedule_type ?? existing.work_schedule_type,
      work_days: work_days !== undefined
        ? (typeof work_days === "string" ? work_days : JSON.stringify(work_days))
        : existing.work_days,
      weekly_day_off: weekly_day_off ?? existing.weekly_day_off,
      start_time: start_time ?? existing.start_time,
      end_time: end_time ?? existing.end_time,
      break_start: break_start ?? existing.break_start,
      break_end: break_end ?? existing.break_end,
      tolerance_minutes: tolerance_minutes !== undefined ? Number(tolerance_minutes) : existing.tolerance_minutes,
      is_active: is_active !== undefined ? Number(is_active) : existing.is_active,
    });

    const updated = db.prepare("SELECT * FROM employees WHERE id = ?").get(id);

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    // Soft delete or hard delete
    db.prepare("UPDATE employees SET is_active = 0 WHERE id = ?").run(id);

    return NextResponse.json({ success: true, message: "Funcionário desativado com sucesso" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
