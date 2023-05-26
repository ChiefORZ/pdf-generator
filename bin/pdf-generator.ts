#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import pdfGenerator from '../src';
import { epilogue } from './epilogue';

void (async () => {
  try {
    const args = yargs(hideBin(process.argv))
      .usage('$0 <url|path> [options]')
      .help('h')
      .alias('h', 'help')
      .version()
      .alias('version', 'v')
      .alias('version', 'V')
      .positional('input', {
        type: 'string',
        describe: 'URL or filepath to statically built website',
      })
      .demandCommand(1)
      .options({
        output: {
          alias: 'o',
          type: 'string',
          describe:
            'Filepath to pdf file. When not defined, pdf buffer is returned in stdout',
        },
        chrome: {
          alias: 'c',
          type: 'string',
          describe:
            'The path to the chromium executable that will be used by puppeteer',
          optional: true,
        },
        'puppeteer-args': {
          alias: 'p',
          type: 'array',
          describe:
            'Additional command line arguments to pass to the browser instance.',
          optional: true,
        },
      })
      .epilogue(epilogue)
      .parseSync();

    const res = await pdfGenerator({
      chromeExecutable: args.chrome as string,
      input: args._[0] as string,
      outputPath: args.output,
    });
    process.stdout.write(res);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.stdout.write(err.message);
    process.exit(1);
  }
})();
