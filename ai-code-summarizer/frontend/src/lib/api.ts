export type FileSummary = {
  path: string; summary: string; line_count: number; char_count: number; chunk_count: number;
  symbols?: { kind: string; name: string; line: number; end_line: number; docstring?: string | null }[];
  imports?: string[];
};
export type AnalysisResult = {
  job_id: string; summary: string; files: FileSummary[];
  stats: { file_count: number; total_lines: number; total_characters: number; total_chunks: number };
  provider_configured: boolean; warnings: string[];
};
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function submitAnalysis(code: string, files: File[], language: string) {
  const form = new FormData();
  if (code.trim()) form.append("code", code);
  form.append("language", language);
  files.forEach((file) => form.append("files", file));
  const response = await fetch(API_BASE + "/api/v1/analyze", { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || "Unable to submit analysis.");
  }
  return response.json() as Promise<{ job_id: string; task_id: string; status: string }>;
}
export async function getJob(jobId: string) {
  const response = await fetch(API_BASE + "/api/v1/jobs/" + encodeURIComponent(jobId), { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to retrieve analysis status.");
  return response.json();
}
