import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("*, employees(name, department, photo_url)")
      .gte("timestamp", startOfDay.toISOString())
      .order("timestamp", { ascending: false })
      .limit(10);

    if (error) {
      if (error.code === "PGRST205") {
        return NextResponse.json({ success: true, records: [] });
      }
      throw error;
    }

    const flattened = (records || []).map((r: any) => ({
      ...r,
      employee_name: r.employees?.name || "Colaborador",
      employee_department: r.employees?.department || "Geral",
      employee_photo: r.employees?.photo_url || null,
    }));

    return NextResponse.json({ success: true, records: flattened });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
