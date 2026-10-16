import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    if (!pin) {
      return NextResponse.json({ success: false, message: "Senha não fornecida." }, { status: 400 });
    }

    const db = getDb();
    const setting = db
      .prepare("SELECT value FROM settings WHERE key = 'terminal_pin'")
      .get() as { value: string } | undefined;

    const actualPin = setting?.value || "1234";

    if (pin.trim() === actualPin.trim()) {
      return NextResponse.json({
        success: true,
        message: "Acesso autorizado ao terminal.",
        companyName: (db.prepare("SELECT value FROM settings WHERE key = 'company_name'").get() as any)?.value || "Gestão de Presença",
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
