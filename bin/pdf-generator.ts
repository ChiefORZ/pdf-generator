#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import pdfGenerator from "../src";
import { epilogue } from "./epilogue";

const exec = async () => {
  try {
    const args = yargs(hideBin(process.argv))
      .usage("$0 <url|path> [options]")
      .help("h")
      .alias("h", "help")
      .version()
      .alias("version", "v")
      .alias("version", "V")
      .positional("input", {
        describe: "URL or filepath to statically built website",
        type: "string",
      })
      .demandCommand(1)
      .options({
        chrome: {
          alias: "c",
          describe: "The path to the chromium executable that will be used by puppeteer",
          optional: true,
          type: "string",
        },
        debug: {
          alias: "d",
          choices: ["browser", "url"],
          describe: "Debug the PDF Generator",
        },
        output: {
          alias: "o",
          describe: "Filepath to pdf file. When not defined, pdf buffer is returned in stdout",
          type: "string",
        },
        "puppeteer-args": {
          alias: "p",
          array: true,
          describe: "Additional command line arguments to pass to the browser instance.",
          optional: true,
          type: "string",
        },
      })
      .epilogue(epilogue)
      .parseSync();

    const res = await pdfGenerator({
      chromeExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? (args.chrome as string),
      input: args._[0] as string,
      outputPath: args.output,
      puppeteerArgs: args.puppeteerArgs,
    });
    if (res) {
      process.stdout.write(res);
      process.exit(0);
    }
  } catch (err) {
    console.error(err);
    process.stdout.write(err.message);
    process.exit(1);
  }
};

(async () => {
  await exec();
})();
