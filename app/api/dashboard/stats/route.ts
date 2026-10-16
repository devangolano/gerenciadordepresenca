import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Employee } from "@/lib/db";

export async function GET() {
  try {
    // 1. Fetch active employees
    const { data: employeesData, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", 1);

    if (empErr && empErr.code === "PGRST205") {
      // Tables not yet created in Supabase
      return NextResponse.json({
        success: true,
        stats: {
          totalEmployees: 0,
          presentToday: 0,
          lateToday: 0,
          absentToday: 0,
          dayOffToday: 0,
          attendanceRate: 0,
        },
        recentPunches: [],
        terminalPin: "1234",
        needsTableSetup: true,
      });
    }

    const employees = (employeesData || []) as Employee[];
    const totalEmployees = employees.length;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Fetch today's attendance records
    const { data: todayRecords } = await supabase
      .from("attendance_records")
      .select("*, employees(name, department, position, photo_url)")
      .gte("timestamp", startOfDay.toISOString())
      .lte("timestamp", endOfDay.toISOString())
      .order("timestamp", { ascending: false });

    const recentPunches = (todayRecords || []).slice(0, 10).map((r: any) => ({
      ...r,
      employee_name: r.employees?.name || "Colaborador",
      employee_department: r.employees?.department || "Geral",
      employee_position: r.employees?.position || "Colaborador",
      employee_photo: r.employees?.photo_url || null,
    }));

    const todayDayOfWeek = new Date().getDay();
    let presentTodayCount = 0;
    let lateTodayCount = 0;
    let dayOffCount = 0;

    employees.forEach((emp) => {
      let workDays = [1, 2, 3, 4, 5];
      try {
        if (emp.work_days) workDays = JSON.parse(emp.work_days);
      } catch {}

      if (!workDays.includes(todayDayOfWeek)) {
        dayOffCount++;
      }

      const empPunchesToday = (todayRecords || []).filter(
        (p: any) => p.employee_id === emp.id
      );

      if (empPunchesToday.length > 0) {
        // Last punch is first in descending order
        const lastPunch = empPunchesToday[0];
        if (lastPunch.type === "entry") {
          presentTodayCount++;
        }
        const hadLate = empPunchesToday.some((p: any) => p.status === "late");
        if (hadLate) {
          lateTodayCount++;
        }
      }
    });

    const absentTodayCount = Math.max(0, totalEmployees - presentTodayCount - dayOffCount);

    // Terminal PIN
    let terminalPin = "1234";
    try {
      const { data: pinRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "terminal_pin")
        .single();
      if (pinRow?.value) terminalPin = pinRow.value;
    } catch {}

    return NextResponse.json({
      success: true,
      stats: {
        totalEmployees,
        presentToday: presentTodayCount,
        lateToday: lateTodayCount,
        absentToday: absentTodayCount,
        dayOffToday: dayOffCount,
        attendanceRate: totalEmployees > 0 ? Math.round((presentTodayCount / totalEmployees) * 100) : 0,
      },
      recentPunches,
      terminalPin,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
