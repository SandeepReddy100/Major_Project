import api from "./axiosConfig";

/**
 * Thin wrappers around the existing `api` axios instance (shared baseURL,
 * cookie auth, and the global network/server-error interceptors already
 * configured in axiosConfig.js). No new HTTP client, no JWT handling here —
 * the browser's webToken cookie rides along via withCredentials.
 */

export function getBatchRisk({ semname, batch, level }) {
  const params = { semname, batch };
  if (level && level !== "ALL") params.level = level;
  return api.get("/api/analytics/batch-risk", { params });
}

export function getStudentRisk({ rollno, semname, batch }) {
  return api.get(`/api/analytics/student-risk/${rollno}`, { params: { semname, batch } });
}

export function getBatchTrend({ semname, batch }) {
  return api.get("/api/analytics/attendance-trend", { params: { semname, batch } });
}

export function getStudentTrend({ rollno, semname, batch }) {
  return api.get(`/api/analytics/attendance-trend/${rollno}`, { params: { semname, batch } });
}

export function postAssistantMessage({ message, semname, batch }) {
  return api.post("/api/analytics/assistant", { message, context: { semname, batch } });
}
