import { Buffer } from 'buffer';
import { PDFDocument, PDFPage } from 'lachs-pdf-lib';

import { Artboard, Element } from 'src/core';
import { format } from 'src/utils';

export default class Workspace {
  meta?: any;

  artboards: Artboard[];

  methods: {
    name: string;
    compiler: (props: any) => any;
    configurer?: (props: any, config: any) => any;
  }[];

  document?: PDFDocument;

  constructor() {
    this.meta = {};

    this.artboards = [];

    this.methods = [];
  }

  addArtboard = (size: [number, number]): Artboard => {
    const artboard = new Artboard(size);

    this.methods.forEach(({ name, compiler, configurer }) => {
      artboard.addMethod(name, compiler, configurer);
    });

    this.artboards.push(artboard);

    return artboard;
  };

  addMethod = async (
    name: string,
    compiler: (props: any) => any,
    configurer?: (props: any, config: any) => any,
  ) => {
    for (const artboard of this.artboards) {
      artboard.addMethod(name, compiler, configurer);
    }

    this.methods.push({ name, compiler, configurer });
  };

  toJSX = () => this.artboards.map((artboard) => artboard.toJSX());

  from = async (pdf: ArrayBuffer) => {
    const workspace = new Workspace();

    workspace.document = await PDFDocument.load(pdf);
    for (const page of workspace.document.getPages()) {
      const { width, height } = page.getSize();
      workspace.addArtboard([width, height]);
    }

    return workspace;
  };

  to = async (
    type: string,
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      individual?: boolean;
      array?: boolean;
    } = {},
  ) => {
    switch (type) {
      //   case 'json':
      //   case 'application/json':
      //     return await this.toJSON(options);

      case 'pdf':
      case 'application/pdf':
        return await this.toPDF(options);

      case 'svg':
      case 'svg+xml':
      case 'image/svg+xml':
        return await this.toSVG(options);

      case 'png':
      case 'image/png':
        return await this.toPNG(options);

      case 'webp':
      case 'image/webp':
        return await this.toWEBP(options);

      case 'jpg':
      case 'jpeg':
      case 'image/jpeg':
        return await this.toJPEG(options);
      default:
        throw new Error('Attempted to export to unknown type, ' + type);
    }
  };

  toPDF = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      individual?: boolean;
      array?: boolean;
    } = {},
  ) => {
    if (this.artboards.length === 0) {
      throw new Error('Workspace is emtpty, no art boards found');
    }

    const { configs, responseType, individual, array } = options;

    if (configs && configs.length < this.artboards.length) {
      throw new Error('Configs provided is less than number of artboards');
    }

    if (configs && individual) {
      return (await Promise.all(
        configs.map(async (config: any, index: number) => {
          const pdfDoc = await PDFDocument.create();

          const idx = index % this.artboards.length;

          const srcPage = this.document
            ? ((await pdfDoc.copyPages(this.document, [idx])[0]) as PDFPage)
            : this.artboards[idx].size;

          this.artboards[idx].configure(config);

          const graphic = await pdfDoc.parseJsx(this.artboards[idx].toJSX());

          const page = pdfDoc.addPage(srcPage);
          const h = page.getHeight();

          page.draw(graphic, { x: 0, y: h });

          const buf = await pdfDoc.save();

          if (responseType && responseType !== 'arrayBuffer') {
            return format('application/pdf', Buffer.from(buf), responseType); // Buffer is faster than doc.saveAsBase64
          }

          return buf;
        }),
      )) as (string | ArrayBuffer)[];
    }

    const doc = await PDFDocument.create();
    let canvas;
    if (this.document) {
      canvas = await doc.copyPages(this.document);
    }

    const drawables = await Promise.all(
      this.artboards.map(
        async (artboard: Artboard) =>
          await Promise.all(
            artboard.elements.map(async (element: Element) => ({
              element,
              graphic: await doc.parseJsx(element.toJSX()),
            })),
          ),
      ),
    );

    if (configs) {
      const pages = configs.map((config: any, index: number) => {
        const page = this.document
          ? canvas[index % this.artboards.length]
          : this.artboards[index % this.artboards.length].size;

        return {
          page: doc.addPage(page),
          config,
        };
      });

      await Promise.all(
        pages.map(
          async (
            { page, config }: { page: PDFPage; config: any },
            index: number,
          ) => {
            const h = page.getHeight();

            for (const drawable of drawables[index % this.artboards.length]) {
              drawable.element.configure(config);

              if (drawable.element.cached) {
                page.draw(drawable.graphic, { x: 0, y: h });
                continue;
              }

              drawable.graphic = await doc.parseJsx(drawable.element.toJSX());
              page.draw(drawable.graphic, { x: 0, y: h });
            }
          },
        ),
      );
    } else {
      await Promise.all(
        this.artboards.map(async (artboard, index) => {
          const page = doc.addPage(
            this.document
              ? canvas[index % this.artboards.length]
              : artboard.size,
          );
          const h = page.getHeight();

          drawables[index].forEach(({ graphic }) =>
            page.draw(graphic, { x: 0, y: h }),
          );
        }),
      );
    }

    const arrayBuffer = await doc.save();

    if (responseType && responseType !== 'arrayBuffer') {
      return array
        ? [format('application/pdf', Buffer.from(arrayBuffer), responseType)]
        : format('application/pdf', Buffer.from(arrayBuffer), responseType); // Buffer is faster than doc.saveAsBase64
    }

    return array ? [arrayBuffer] : arrayBuffer;
  };

  toSVG = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      array?: boolean;
    } = {},
  ) => {
    if (this.document) {
      throw new Error(
        'Workspace created by PDF document can not exported to SVG',
      );
    }

    if (this.artboards.length === 0) {
      throw new Error('Workspace is emtpty, no art boards found');
    }

    const { configs, responseType, array } = options;
    if (configs) {
      const svg = [];

      for (const [index, config] of configs.entries()) {
        const idx = index % this.artboards.length;
        await this.artboards[idx].configure(config);
        svg.push(
          (await this.artboards[idx].toSVG({
            responseType,
          })) as string | ArrayBuffer,
        );
      }

      return svg;
    }

    return this.artboards.length > 1 || array
      ? await Promise.all(
          this.artboards.map(
            async (artboard) =>
              (await artboard.toSVG({ responseType })) as string | ArrayBuffer,
          ),
        )
      : this.artboards[0].toSVG({ responseType });
  };

  toPNG = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      array?: boolean;
    } = {},
  ) => {
    if (this.document) {
      throw new Error(
        'Workspace created by PDF document can not exported to PNG',
      );
    }

    if (this.artboards.length === 0) {
      throw new Error('Workspace is emtpty, no artboards found');
    }

    const { configs, responseType, array } = options;
    if (configs) {
      const png = [];
      for (const [index, config] of configs.entries()) {
        const idx = index % this.artboards.length;
        await this.artboards[idx].configure(config);
        png.push(
          (await this.artboards[idx].toPNG({
            responseType,
          })) as string | ArrayBuffer,
        );
      }
      return png;
    }
    return this.artboards.length > 1 || array
      ? await Promise.all(
          this.artboards.map(
            async (artboard) =>
              (await artboard.toPNG({ responseType })) as string | ArrayBuffer,
          ),
        )
      : this.artboards[0].toPNG({ responseType });
  };

  toJPEG = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      array?: boolean;
    } = {},
  ) => {
    if (this.document) {
      throw new Error(
        'Workspace created by PDF document can not exported to JPEG',
      );
    }

    if (this.artboards.length === 0) {
      throw new Error('Workspace is emtpty, no artboards found');
    }

    const { configs, responseType, array } = options;
    if (configs) {
      const jpegs = [];
      for (const [index, config] of configs.entries()) {
        const idx = index % this.artboards.length;
        await this.artboards[idx].configure(config);
        jpegs.push(
          (await this.artboards[idx].toJPEG({
            responseType,
          })) as string | ArrayBuffer,
        );
      }
      return jpegs;
    }
    return this.artboards.length > 1 || array
      ? await Promise.all(
          this.artboards.map(
            async (artboard) =>
              (await artboard.toJPEG({ responseType })) as string | ArrayBuffer,
          ),
        )
      : this.artboards[0].toJPEG({ responseType });
  };

  toWEBP = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      array?: boolean;
    } = {},
  ) => {
    if (this.document) {
      throw new Error(
        'Workspace created by PDF document can not exported to WEBP',
      );
    }

    if (this.artboards.length === 0) {
      throw new Error('Workspace is emtpty, no art boards found');
    }

    const { configs, responseType, array } = options;
    if (configs) {
      const webps = [];
      for (const [index, config] of configs.entries()) {
        const idx = index % this.artboards.length;
        await this.artboards[idx].configure(config);
        webps.push(
          (await this.artboards[idx].toWEBP({
            responseType,
          })) as string | ArrayBuffer,
        );
      }
      return webps;
    }
    return this.artboards.length > 1 || array
      ? await Promise.all(
          this.artboards.map(
            async (artboard) =>
              (await artboard.toWEBP({ responseType })) as string | ArrayBuffer,
          ),
        )
      : this.artboards[0].toWEBP({ responseType });
  };
}
