import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const inputPath = path.resolve(root, "docs/postman/GuririExpress.postman_collection.json");
const outputPath = path.resolve(root, "docs/api");

interface PostmanVariable {
  key: string;
  value: string;
}

interface PostmanHeader {
  key: string;
  value: string;
}

interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  body?: { raw?: string };
  url?: { raw?: string };
  description?: string;
}

interface PostmanResponse {
  name?: string;
  code?: number;
  body?: string;
}

interface PostmanItem {
  name: string;
  description?: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
  response?: PostmanResponse[];
}

interface PostmanCollection {
  info: { name: string };
  variable?: PostmanVariable[];
  item: PostmanItem[];
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/--+/g, "-");

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const resetOutputDir = async () => {
  await fs.rm(outputPath, { recursive: true, force: true });
  await ensureDir(outputPath);
};

const formatHeadersTable = (headers?: PostmanHeader[]) => {
  if (!headers?.length) return "";
  const rows = headers.map((header) => `| ${header.key} | ${header.value} |`).join("\n");
  return `\n### Headers\n\n| Key | Value |\n|-----|-------|\n${rows}\n`;
};

const formatBody = (body?: { raw?: string }) => {
  if (!body?.raw) return "";
  return `\n### Body\n\n\`\`\`json\n${body.raw.trim()}\n\`\`\`\n`;
};

const formatResponses = (responses?: PostmanResponse[]) => {
  if (!responses?.length) return "";
  return responses
    .map((response) => {
      const title = response.code
        ? response.name?.startsWith(String(response.code))
          ? response.name
          : `${response.code} ${response.name ?? ""}`.trim()
        : response.name ?? "Response";
      const body = response.body ? `\n\`\`\`json\n${response.body.trim()}\n\`\`\`` : "";
      return `### ${title}\n${body}\n`;
    })
    .join("\n");
};

const formatRequestBlock = (request: PostmanRequest) => {
  const method = request.method.toUpperCase();
  const url = request.url?.raw ?? "";
  let block = `\n## Request\n\n\`\`\`\n${method} ${url}\n\`\`\``;
  block += formatHeadersTable(request.header);
  block += formatBody(request.body);
  return block;
};

const writeFile = async (filePath: string, content: string) => {
  await fs.writeFile(filePath, content.replace(/\r?\n/g, "\n"));
};

const sanitizeRequestName = (name: string) => name.replace(/^([A-Z]+)\s+/i, "").trim();

const buildRequestDoc = (item: PostmanItem) => {
  if (!item.request) throw new Error(`Missing request for item ${item.name}`);
  const method = item.request.method.toUpperCase();
  const title = `# ${method} ${item.request.url?.raw ?? item.name}`;
  const description = item.request.description ?? item.description ?? "";
  const requestMd = formatRequestBlock(item.request);
  const responsesMd = formatResponses(item.response);
  return [title, "", description.trim(), requestMd, "\n## Responses\n", responsesMd].join("\n").trim() + "\n";
};

const buildFolderIndex = (folderName: string, entries: { method: string; path: string; fileName: string; description: string }[]) => {
  const rows = entries
    .map((entry) => `| ${entry.method} | [${entry.path}](./${entry.fileName}) | ${entry.description} |`)
    .join("\n");
  return `# ${folderName}\n\n| Method | Path | Description |\n|--------|------|-------------|\n${rows}\n`;
};

const generateDocs = async () => {
  await resetOutputDir();
  const raw = await fs.readFile(inputPath, "utf-8");
  const collection = JSON.parse(raw) as PostmanCollection;
  const sections = [] as { name: string; slug: string }[];

  for (const section of collection.item) {
    if (!section.item?.length) continue;
    const slug = slugify(section.name);
    const folderPath = path.join(outputPath, slug);
    await ensureDir(folderPath);

    const entries = [] as { method: string; path: string; fileName: string; description: string }[];

    for (const requestItem of section.item) {
      if (!requestItem.request) continue;
      const method = requestItem.request.method.toUpperCase();
      const endpointPath = requestItem.request.url?.raw ?? requestItem.name;
      const cleanName = sanitizeRequestName(requestItem.name || "request");
      const fileName = `${method}-${slugify(cleanName)}.md`;
      const docContent = buildRequestDoc(requestItem);
      await writeFile(path.join(folderPath, fileName), docContent);
      entries.push({
        method: method === "GET" ? "🟢 `GET`" : method === "POST" ? "🟡 `POST`" : `\`${method}\``,
        path: endpointPath.replace("{{API_URL}}", ""),
        fileName,
        description: requestItem.request.description?.split("\n")[0] ?? requestItem.name,
      });
    }

    const indexContent = buildFolderIndex(section.name, entries);
    await writeFile(path.join(folderPath, "index.md"), indexContent);
    sections.push({ name: section.name, slug });
  }

  const rootIndexRows = sections
    .map((section) => {
      const label = section.name;
      const description = section.name === "Authentication"
        ? "Register/login endpoints"
        : section.name === "Orders"
          ? "Order lifecycle"
          : section.name === "Chat & AI"
            ? "Messaging + AI"
            : section.name === "Analytics"
              ? "KPIs and payouts"
              : `${section.name} endpoints`;
      return `| [${label}](./${section.slug}/index.md) | ${description} |`;
    })
    .join("\n");
  const rootIndex = `# ${collection.info.name}\n\n| Section | Description |\n|---------|-------------|\n${rootIndexRows}\n`;
  await writeFile(path.join(outputPath, "index.md"), rootIndex);

  const variables = (collection.variable ?? [])
    .map((variable) => `| ${variable.key} | ${variable.value || "_empty_"} |`)
    .join("\n");
  if (variables) {
    await writeFile(
      path.join(outputPath, "variables.md"),
      `# Environment Variables\n\n| Key | Default |\n|-----|---------|\n${variables}\n`,
    );
  }

  await writeFile(
    path.join(outputPath, "index.json"),
    JSON.stringify(
      {
        name: collection.info.name,
        source: path.relative(root, inputPath),
        sections,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
};

generateDocs().catch((error) => {
  console.error("Failed to generate Postman docs", error);
  process.exitCode = 1;
});
