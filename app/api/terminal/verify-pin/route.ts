import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    if (!pin) {
      return NextResponse.json({ success: false, message: "Senha não fornecida." }, { status: 400 });
    }

    let actualPin = "1234";
    let companyName = "Gestão de Presença & Biometria";

    try {
      const { data: pinRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "terminal_pin")
        .single();

      if (pinRow?.value) {
        actualPin = pinRow.value;
      }

      const { data: compRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "company_name")
        .single();

      if (compRow?.value) {
        companyName = compRow.value;
      }
    } catch {}

    if (pin.trim() === actualPin.trim()) {
      return NextResponse.json({
        success: true,
        message: "Acesso autorizado ao terminal.",
        companyName,
      });
    }

    return NextResponse.json(
      { success: false, message: "Senha incorreta. Tente novamente." },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
