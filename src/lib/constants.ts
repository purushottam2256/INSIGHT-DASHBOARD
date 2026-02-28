export const DEPARTMENTS = [
  { value: "H&S", label: "H&S" },
  { value: "CSE", label: "CSE" },
  { value: "CSM", label: "CSM" },
  { value: "CSD-AIDS", label: "CSD-AIDS" },
  { value: "CSC", label: "CSC" },
  { value: "AIML", label: "AIML" },
  { value: "ECE", label: "ECE" },
  { value: "EEE", label: "EEE" },
  { value: "MECH", label: "Mechanical" },
  { value: "IT", label: "IT" },
];

export const YEARS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
];

export const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Roles that have cross-department and elevated access */
export const ELEVATED_ROLES = ['principal', 'management', 'developer', 'admin'] as const;
