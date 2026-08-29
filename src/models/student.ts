export type Student = {
  id: string;
  registerNumber: string;
  name: string;
  branch: string;
  section?: string;
  department?: string;
};

export type BranchInfo = {
  branch: string;
  count: number;
};

export type StudentImportRaw = Record<string, string | number>;
