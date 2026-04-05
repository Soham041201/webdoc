import { execSync } from "node:child_process";

const SCREEN_SCALE = 0.85;

export function getScreenSize(): { width: number; height: number } {
  try {
    const platform = process.platform;

    if (platform === "darwin") {
      const output = execSync(
        "system_profiler SPDisplaysDataType 2>/dev/null | grep -m1 'Resolution'",
        { encoding: "utf8" },
      );
      const match = output.match(/(\d+)\s*x\s*(\d+)/);
      if (match) {
        return {
          width: Math.round(parseInt(match[1], 10) * SCREEN_SCALE),
          height: Math.round(parseInt(match[2], 10) * SCREEN_SCALE),
        };
      }
    } else if (platform === "linux") {
      const output = execSync("xdpyinfo 2>/dev/null | grep dimensions", {
        encoding: "utf8",
      });
      const match = output.match(/(\d+)x(\d+)/);
      if (match) {
        return {
          width: Math.round(parseInt(match[1], 10) * SCREEN_SCALE),
          height: Math.round(parseInt(match[2], 10) * SCREEN_SCALE),
        };
      }
    }
  } catch {
    // fall through to default
  }

  return { width: 1280, height: 720 };
}
