// Type definitions for Employee and AttendanceRecord

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
