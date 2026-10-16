import { NextResponse } from "next/server";
import { getDb, Employee } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();

    // Total active employees
    const totalEmployeesRow = db
      .prepare("SELECT COUNT(*) as count FROM employees WHERE is_active = 1")
      .get() as { count: number };
    const totalEmployees = totalEmployeesRow.count;

    // All active employees
    const employees = db
      .prepare("SELECT * FROM employees WHERE is_active = 1")
      .all() as Employee[];

    const todayDayOfWeek = new Date().getDay();

    let presentTodayCount = 0;
    let lateTodayCount = 0;
    let dayOffCount = 0;

    // Check each employee status today
    employees.forEach((emp) => {
      let workDays = [1, 2, 3, 4, 5];
      try {
        if (emp.work_days) workDays = JSON.parse(emp.work_days);
      } catch {}

      if (!workDays.includes(todayDayOfWeek)) {
        dayOffCount++;
      }

      const todayPunches = db
        .prepare(`
          SELECT * FROM attendance_records 
          WHERE employee_id = ? AND date(timestamp) = date('now', 'localtime')
          ORDER BY timestamp ASC
        `)
        .all(emp.id) as any[];

      if (todayPunches.length > 0) {
        const lastPunch = todayPunches[todayPunches.length - 1];
        if (lastPunch.type === "entry") {
          presentTodayCount++;
        }
        const hadLateEntry = todayPunches.some((p) => p.status === "late");
        if (hadLateEntry) {
          lateTodayCount++;
        }
      }
    });

    const absentTodayCount = Math.max(0, totalEmployees - presentTodayCount - dayOffCount);

    // Recent 10 punches
    const recentPunches = db
      .prepare(`
        SELECT 
          a.*,
          e.name as employee_name,
          e.department as employee_department,
          e.position as employee_position,
          e.photo_url as employee_photo
        FROM attendance_records a
        JOIN employees e ON a.employee_id = e.id
        WHERE date(a.timestamp) = date('now', 'localtime')
        ORDER BY a.timestamp DESC
        LIMIT 10
      `)
      .all();

    // Terminal PIN check status
    const terminalPin = (db.prepare("SELECT value FROM settings WHERE key = 'terminal_pin'").get() as any)?.value || "1234";

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
