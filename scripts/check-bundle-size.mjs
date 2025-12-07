import { createReadStream, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { createGzip } from "zlib";

const DIST_DIR = join(process.cwd(), "dist", "public", "assets");
const LIMIT_KB = 550; // gzip kilobytes threshold

function gzippedSize(filePath) {
  return new Promise((resolve, reject) => {
    const gzip = createGzip();
    const stream = createReadStream(filePath);
    let size = 0;
    gzip.on("data", (chunk) => {
      size += chunk.length;
    });
    gzip.on("end", () => resolve(size));
    gzip.on("error", reject);
    stream.on("error", reject);
    stream.pipe(gzip);
  });
}

async function main() {
  try {
    const entries = readdirSync(DIST_DIR).filter((f) => extname(f) === ".js");
    if (entries.length === 0) {
      console.error("No JS assets found in", DIST_DIR, "- run `npm run build` first.");
      process.exit(1);
    }

    let hasFail = false;
    for (const file of entries) {
      const abs = join(DIST_DIR, file);
      if (!statSync(abs).isFile()) continue;
      const gzSize = await gzippedSize(abs);
      const kb = gzSize / 1024;
      const line = `${file} gzip ${(kb).toFixed(1)} kB`;
      if (kb > LIMIT_KB) {
        hasFail = true;
        console.error("❌", line, "(limit", LIMIT_KB, "kB)");
      } else {
        console.log("✅", line);
      }
    }

    if (hasFail) {
      console.error("Bundle size check failed: some chunks exceed", LIMIT_KB, "kB gzip.");
      process.exit(1);
    } else {
      console.log("Bundle size check passed. Limit:", LIMIT_KB, "kB gzip.");
    }
  } catch (err) {
    console.error("Bundle size check error:", err.message || err);
    process.exit(1);
  }
}

main();
