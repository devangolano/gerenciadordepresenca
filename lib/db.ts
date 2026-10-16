import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "presenca.db");
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      document TEXT,
      email TEXT,
      phone TEXT,
      department TEXT NOT NULL DEFAULT 'Operações',
      position TEXT NOT NULL DEFAULT 'Colaborador',
      pin TEXT DEFAULT '1234',
      photo_url TEXT,
      face_descriptor TEXT,
      fingerprint_id TEXT,
      work_schedule_type TEXT DEFAULT 'mon_fri',
      work_days TEXT DEFAULT '[1,2,3,4,5]',
      weekly_day_off TEXT DEFAULT 'Sábado e Domingo',
      start_time TEXT DEFAULT '08:00',
      end_time TEXT DEFAULT '17:00',
      break_start TEXT DEFAULT '12:00',
      break_end TEXT DEFAULT '13:00',
      tolerance_minutes INTEGER DEFAULT 15,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      type TEXT NOT NULL,
      verification_method TEXT NOT NULL,
      status TEXT NOT NULL,
      delay_minutes INTEGER DEFAULT 0,
      photo_snapshot TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_records(timestamp);
  `);

  // Default settings
  const checkPin = db.prepare("SELECT value FROM settings WHERE key = 'terminal_pin'").get();
  if (!checkPin) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('terminal_pin', '1234')").run();
    db.prepare("INSERT INTO settings (key, value) VALUES ('company_name', 'Gestão de Presença & Biometria')").run();
    db.prepare("INSERT INTO settings (key, value) VALUES ('tolerance_default', '15')").run();
  }



  dbInstance = db;
  return dbInstance;
}

export interface Employee {
  id: number;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  department: string;
  position: string;
  pin?: string;
  photo_url?: string;
  face_descriptor?: string; // JSON string of 128 floats
  fingerprint_id?: string;
  work_schedule_type: string;
  work_days: string; // JSON string array of numbers 0..6
  weekly_day_off: string;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  tolerance_minutes: number;
  is_active: number;
  created_at: string;
  // Dynamic fields
  today_punches?: AttendanceRecord[];
  current_status?: "present" | "absent" | "day_off";
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_photo?: string;
  employee_department?: string;
  timestamp: string;
  type: "entry" | "exit" | "break_start" | "break_end";
  verification_method: "face" | "fingerprint" | "pin";
  status: "on_time" | "late" | "early_exit" | "day_off_work" | "overtime";
  delay_minutes: number;
  photo_snapshot?: string;
  notes?: string;
  created_at: string;
}
