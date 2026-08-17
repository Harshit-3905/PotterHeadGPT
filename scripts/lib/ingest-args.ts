export type IngestCliArgs = {
  path: string;
};

export function parseIngestArgs(argv: string[]): IngestCliArgs {
  const args: IngestCliArgs = { path: "books/prepared" };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === "--s3") {
      throw new Error(
        "--s3 is not supported yet. Prepare books locally and pass --path to the prepared directory.",
      );
    }

    if (flag === "--path" && value) {
      args.path = value;
      index += 1;
    }
  }

  return args;
}