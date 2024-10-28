import { EventRef, Notice, Plugin, TAbstractFile, TFile } from "obsidian";
import { format } from "date-fns/format";

export default class FrontMatterPlugin extends Plugin {
  private eventRefs: EventRef[] = [];

  async onload() {
    // As a part of Obsidian's vault initialization process, it will call create for every file.
    // We need to wait for the workspace to be ready first.
    // https://docs.obsidian.md/Plugins/Guides/Optimizing+plugin+load+time
    this.app.workspace.onLayoutReady(() => {
      this.registerEvents();
    });
  }

  onunload() {
    for (const eventRef of this.eventRefs) {
      this.app.workspace.offref(eventRef);
    }
  }

  registerEvents() {
    const createRef = this.app.vault.on("create", (file: TAbstractFile) =>
      this.handleFileChange(file)
    );
    this.registerEvent(createRef);
    this.eventRefs.push(createRef);

    const modifyRef = this.app.vault.on("modify", (file: TAbstractFile) =>
      this.handleFileChange(file)
    );
    this.registerEvent(modifyRef);
    this.eventRefs.push(modifyRef);
  }

  async handleFileChange(
    file: TAbstractFile
  ): Promise<
    { status: "ok" } | { status: "error"; error: any } | { status: "ignored" }
  > {
    if (!isTFile(file) || ignoreFile(file)) {
      return { status: "ignored" };
    }

    const fileContent = await this.app.vault.read(file);
    let body = fileContent;
    if (/^(---(.|\n)+?---)/.test(body)) {
      body = body.replace(/^(---(.|\n)+?---)/g, ``);
    }

    if (body.length === 0) {
      return { status: "ignored" };
    }

    const hash = await sha(body.trim());
    if (fileContent.contains(hash)) {
      return { status: "ignored" };
    }

    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        const ctime = formatTimestamp(file.stat.ctime);
        const mtime = formatTimestamp(file.stat.mtime);

        if (!frontmatter["created"]) {
          frontmatter["created"] = ctime;
        }

        if (!frontmatter["modified"]) {
          frontmatter["modified"] = mtime;
        }

        if (!frontmatter["hash"]) {
          frontmatter["hash"] = hash;
        }

        if (frontmatter["modified"] === mtime || frontmatter["hash"] === hash) {
          return;
        }

        frontmatter["hash"] = hash;
        frontmatter["modified"] = mtime;
      });
    } catch (e: any) {
      if (e?.name === "YAMLParseError") {
        const errorMessage = `Timestamp failed to update because of malformed frontmatter on this file : ${file.path} ${e.message}`;
        new Notice(errorMessage, 4000);
        console.error(errorMessage);
        return {
          status: "error",
          error: e,
        };
      }
    }

    return { status: "ok" };
  }
}

function isTFile(value: TAbstractFile): value is TFile {
  return "stat" in value;
}

function ignoreFile(file: TFile): boolean {
  if (
    file.extension !== "md" ||
    file.parent?.path === "/" ||
    file.parent?.path.startsWith(".git") ||
    file.parent?.path.startsWith(".obsidian") ||
    file.parent?.path.startsWith("archive") ||
    file.parent?.path.startsWith("assets") ||
    file.parent?.path.startsWith("templates")
  ) {
    return true;
  }

  return false;
}

function formatTimestamp(input: number): string {
  return format(new Date(input), "yyyy-MM-dd'T'HH:mm");
}

async function sha(content: string) {
  const msgBuffer = new TextEncoder().encode(content); // encode as UTF-8
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert ArrayBuffer to Array
  const hashHex = hashArray
    .map((b) => ("00" + b.toString(16)).slice(-2))
    .join(""); // convert bytes to hex string
  return hashHex;
}
