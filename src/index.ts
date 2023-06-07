import fontkit from '@pdf-lib/fontkit';
import Debug from 'debug';
import type { Express } from 'express';
import express from 'express';
import glob from 'fast-glob';
import fs from 'fs';
import { lstat, mkdir } from 'fs/promises';
import type { Server } from 'http';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import PCR from 'puppeteer-chromium-resolver';
import type { PaperFormat, PDFOptions } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import report from 'puppeteer-report';
import util from 'util';

const urlRegExp = new RegExp(
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/
);

const debug = Debug('pdf-generator');

const writeFileAsync = util.promisify(fs.writeFile);

const pdfOptions: PDFOptions = {
  format: 'a4' as PaperFormat,
  margin: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  printBackground: true,
};

const createExpressServer = (
  port = 13770
): Promise<{ app: Express; server: Server }> =>
  new Promise((resolve) => {
    const app = express();
    const server = app.listen(port, () => {
      resolve({ app, server });
    });
    server.on('error', () => {
      resolve(createExpressServer(port + 1));
    });
  });

interface IArgs {
  chromeExecutable: string;
  input: string;
  debug?: 'browser' | 'url';
  outputPath?: string;
  puppeteerArgs?: string[];
}

// @ts-ignore
const pdfGenerator = async (args: IArgs) => {
  if (!args.input) {
    throw new Error(
      'A valid input is needed, provide either a URL or a Path to a static website.'
    );
  }

  let url: string | undefined;
  // check if input is a valid url
  if (args.input.match(urlRegExp)) {
    url = args.input;
  } else {
    const pathStat = await lstat(args.input);
    if (pathStat.isFile()) {
      throw new Error(
        'A path to a statically built website is needed. Please provide a folder instead of a file.'
      );
    }
  }
  let pathToStaticFiles: string | undefined;
  let server;
  if (!url) {
    pathToStaticFiles = path.isAbsolute(args.input)
      ? args.input
      : path.join(process.cwd(), args.input);
    const expressServer = await createExpressServer();
    const { app } = expressServer;
    server = expressServer.server;
    const { port } = server.address();
    debug('Express server initiated on port', port);

    debug('Serving static file from', pathToStaticFiles);
    app.use('/', express.static(pathToStaticFiles));
    url = `http://127.0.0.1:${port}`;
  }

  let chromeExecutable = args.chromeExecutable;

  if (!chromeExecutable) {
    const pcr = await PCR();
    chromeExecutable = await pcr.executablePath;
  }

  debug('Launching chrome browser at', chromeExecutable);
  debug('Running with additional puppeteer args ', args?.puppeteerArgs);
  const browser = await puppeteer.launch({
    executablePath: chromeExecutable,
    headless: args.debug !== 'browser',
    args: args?.puppeteerArgs ?? [],
  });

  const page = await browser.newPage();

  debug('waiting for dom');
  await page.goto(url, { waitUntil: 'load' });
  debug('dom loaded');

  await page.emulateMediaType('print');
  await page.evaluateHandle('document.fonts.ready');

  const canvasToImageElements = await page.$$('.canvas-to-image');

  if (canvasToImageElements.length) {
    const canvasToImagePromises = canvasToImageElements.map(
      async (canvasToImageElement) => {
        const base64Screenshot = (await canvasToImageElement.screenshot({
          encoding: 'base64',
        })) as string;
        await canvasToImageElement.$eval(
          '*',
          (element, base64) => {
            // @ts-ignore ts(2339)
            element.style.display = 'none';
            element.outerHTML = `<img src="data:image/png;base64, ${base64}" />`;
          },
          base64Screenshot
        );
      }
    );
    await Promise.all(canvasToImagePromises);
  }
  if (args.debug === 'url') {
    process.stdout.write(url);
  }
  if (!args.debug) {
    // @ts-ignore
    const pdfContent = await report.pdfPage(page, pdfOptions);

    await browser.close();
    if (server) await server.close();
    debug('Closed chrome instance and express server');

    const finalPdf = await PDFDocument.create();
    if (pathToStaticFiles) {
      finalPdf.registerFontkit(fontkit);
      const fontsToInclude = await glob(
        path.join(pathToStaticFiles, '**', '*.ttf')
      );
      await Promise.all(
        fontsToInclude.map(async (fontToInclude) => {
          const fontBytes = await fs.promises.readFile(fontToInclude);
          return finalPdf.embedFont(fontBytes);
        })
      );
    } else {
      // TODO: Find a way to inject fonts that are loaded on websites
    }

    const content = await PDFDocument.load(pdfContent);
    const contentPages = await finalPdf.copyPages(
      content,
      content.getPageIndices()
    );
    for (const contentPage of contentPages) {
      finalPdf.addPage(contentPage);
    }

    const pdfBytes = await finalPdf.save();

    if (args.outputPath) {
      const outputPath = path.isAbsolute(args.outputPath)
        ? args.outputPath
        : path.join(process.cwd(), args.outputPath);
      try {
        await lstat(outputPath);
      } catch (_) {
        await mkdir(outputPath.substring(0, outputPath.lastIndexOf(path.sep)), {
          recursive: true,
        });
      }
      debug('Writing file at', args.outputPath);
      await writeFileAsync(args.outputPath, pdfBytes);
      debug('PDF generation has been successfully finished!');
      return args.outputPath;
    }

    debug('Return pdf content to stdout');
    return pdfBytes;
  }
};

export default pdfGenerator;
