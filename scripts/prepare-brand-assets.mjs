/**
 * Sync approved brand binaries from the existing public Alveary planner repo.
 * The user has confirmed CMI has permission to reuse these font assets.
 *
 * Assets are imported into the build output and NOT kept as binary blobs
 * in this GitHub repository. SHA-1 Git blob checks pin the exact source files.
 * If the old source changes, fail rather than silently substituting assets.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const assets = [
  {
    from: "assets/fonts/plantin/plantinmtprorg-webfont.woff2",
    to: "public/brand/fonts/plantin-mt-pro.woff2",
    sha: "f8e5c79cc4a50b140059347abcfea35ad4bc40c4",
  },
  {
    from: "assets/fonts/circular/circularpro-medium-webfont.woff2",
    to: "public/brand/fonts/circular-pro-medium.woff2",
    sha: "4bf3c117758817b0b158b51f82a6ed1132abdd6b",
  },
  {
    from: "img/Alveary Lt. Green.png",
    to: "public/brand/logos/alveary-mark.png",
    sha: "60e56a4d057f9591d54b52842e51780b3f0b2d74",
  },
];

const sourceRoot = "https://raw.githubusercontent.com/kkeel/course-picker/main/";
const repoRoot = process.cwd();

function gitBlobSha(buf) {
  return createHash("sha1").update(`blob ${buf.byteLength}\0`).update(buf).digest("hex");
}

async function getAsset({ from, to, sha }) {
  const destination = join(repoRoot, to);
  try {
    const existing = await readFile(destination);
    if (gitBlobSha(existing) === sha) {
      console.log(`Ready: ${to}`);
      return;
    }
  } catch { /* File does not exist yet. */ }

  const url = sourceRoot + from.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    throw new Error(`Failed to download ${from}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const actualSha = gitBlobSha(bytes);
  if (actualSha !== sha) {
    throw new Error(`Asset checksum mismatch for ${from}. Expected ${sha}, got ${actualSha}`);
  }
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  console.log(`Verified and prepared: ${to}`);
}

for (const asset of assets) {
  await getAsset(asset);
}
