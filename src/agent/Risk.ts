/**
 * Risk assessment for API calls
 */

export type RiskLevel = "low" | "medium" | "high";

export function assessRisk(method: string, url: string): RiskLevel {
  const upperMethod = method.toUpperCase();
  const lowerUrl = url.toLowerCase();

  // High risk: destructive methods
  if (upperMethod === "DELETE") return "high";

  // High risk: financial/payment endpoints
  if (lowerUrl.match(/checkout|payment|order|purchase|billing|subscription/)) {
    return "high";
  }

  // High risk: account modification
  if (lowerUrl.match(/\/users\/[^/]+\/delete|\/account\/close|\/account\/delete/)) {
    return "high";
  }

  // Medium risk: modification methods
  if (upperMethod === "PUT" || upperMethod === "PATCH") {
    return "medium";
  }

  // Medium risk: authentication endpoints
  if (lowerUrl.match(/\/auth\/|\/login|\/logout|\/register/)) {
    return "medium";
  }

  // Low risk: safe methods
  return "low";
}
