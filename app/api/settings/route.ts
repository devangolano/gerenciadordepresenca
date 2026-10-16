import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from("settings").select("*");

    if (error) {
      if (error.code === "PGRST205") {
        return NextResponse.json({
          success: true,
          settings: {
            terminal_pin: "1234",
            company_name: "Gestão de Presença & Biometria",
            tolerance_default: "15",
          },
        });
      }
      throw error;
    }

    const settings: Record<string, string> = {
      terminal_pin: "1234",
      company_name: "Gestão de Presença & Biometria",
      tolerance_default: "15",
    };

    (rows || []).forEach((r: any) => {
      settings[r.key] = r.value;
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const keys = Object.keys(body);

    for (const key of keys) {
      await supabase.from("settings").upsert(
        {
          key,
          value: String(body[key]),
        },
        { onConflict: "key" }
      );
    }

    return NextResponse.json({ success: true, message: "Configurações salvas com sucesso no Supabase!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
