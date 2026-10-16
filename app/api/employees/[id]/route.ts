import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { data: employee, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !employee) {
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

    const updateFields: any = {};
    const allowedKeys = [
      "name",
      "document",
      "email",
      "phone",
      "department",
      "position",
      "pin",
      "photo_url",
      "face_descriptor",
      "fingerprint_id",
      "work_schedule_type",
      "work_days",
      "weekly_day_off",
      "start_time",
      "end_time",
      "break_start",
      "break_end",
      "tolerance_minutes",
      "is_active",
    ];

    allowedKeys.forEach((key) => {
      if (body[key] !== undefined) {
        if (key === "work_days" && typeof body[key] !== "string") {
          updateFields[key] = JSON.stringify(body[key]);
        } else if (key === "tolerance_minutes") {
          updateFields[key] = Number(body[key]);
        } else {
          updateFields[key] = body[key];
        }
      }
    });

    const { data: updated, error } = await supabase
      .from("employees")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

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
    const { error } = await supabase
      .from("employees")
      .update({ is_active: 0 })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Funcionário desativado com sucesso" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
