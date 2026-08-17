import { pathToFileURL } from "node:url";
import { prepareBooks } from "./lib/prepare-book";

type CliArgs = {
  path: string;
  out: string;
};

export function parsePrepareArgs(argv: string[]): CliArgs {
  const args: CliArgs = { path: "books", out: "books/prepared" };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === "--path" && value) {
      args.path = value;
      index += 1;
      continue;
    }
    if (flag === "--out" && value) {
      args.out = value;
      index += 1;
    }
  }

  return args;
}

async function main(): Promise<void> {
  const args = parsePrepareArgs(process.argv.slice(2));
  const result = await prepareBooks({
    sourceDir: args.path,
    outDir: args.out,
  });
  console.log(`Done: ${result.books} books, ${result.chapters} chapters`);
}

const isCli =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
