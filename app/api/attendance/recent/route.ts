import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const records = db
      .prepare(`
        SELECT 
          a.*,
          e.name as employee_name,
          e.department as employee_department,
          e.photo_url as employee_photo
        FROM attendance_records a
        JOIN employees e ON a.employee_id = e.id
        WHERE date(a.timestamp) = date('now', 'localtime')
        ORDER BY a.timestamp DESC
        LIMIT 10
      `)
      .all();

    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
