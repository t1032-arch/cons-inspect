// 對應 workplan_v2.md 第16節資料結構草案（insp_ 前綴表）

export type InspectionResult = 'good' | 'acceptable' | 'poor' | 'na';

export type ProjectStatus = 'active' | 'completed' | 'disabled';

export type UserRole = 'admin' | 'user';

export type PhotoUploadStatus = 'pending' | 'uploaded' | 'failed';

export interface InspProject {
  id: string;
  project_name: string;
  contractor: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  department: string | null;
  manager: string | null;
  status: ProjectStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspUserRole {
  user_id: string;
  user_email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface InspProjectAssignee {
  id: string;
  project_id: string;
  user_email: string;
  assigned_at: string;
  assigned_by: string;
}

export interface InspInspection {
  id: string;
  project_id: string;
  inspection_date: string;
  inspection_time: string;
  location: string;
  inspector: string;
  note: string | null;
  signature_file_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspInspectionItemDefinition {
  item_no: number;
  title: string;
  description: string;
}

export interface InspInspectionItem {
  id: string;
  inspection_id: string;
  item_no: number;
  result: InspectionResult | null;
}

export interface InspInspectionEditLog {
  id: string;
  inspection_id: string;
  edited_by: string;
  edited_at: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
}

export interface InspInspectionPhoto {
  id: string;
  inspection_id: string;
  drive_file_id: string | null;
  filename: string;
  caption: string | null;
  upload_status: PhotoUploadStatus;
  created_at: string;
}
