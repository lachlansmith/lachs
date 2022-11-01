import { Buffer } from 'buffer';
import { PDFDocument, PDFPage } from 'lachs-pdf-lib';

import Artboard from 'src/core/artboard';
import Element from 'src/core/element';
import { methods } from 'src/core';

export default class Workspace {
  artboards: Artboard[];
  methods: {
    name: string;
    compiler: (props: any) => any;
  }[];

  constructor() {
    this.artboards = [];
    this.methods = methods;
  }

  addArtBoard = (size: [number, number]) => {
    const artboard = new Artboard(size, {
      index: this.artboards.length,
    }) as any;

    // this.methods.forEach(({ name, compiler }) => {
    //   artboard.addMethod(name, compiler);
    // });

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

    this.methods.push({ name, compiler });
  };

  dump = (json: {
    artboards: { size: [number, number] }[];
    elements: {
      method: { name: string; type: 'Shape' };
      board: number;
      position: number;
      defprops: any;
      defconfig: any;
    }[];
  }) => {
    const { artboards, elements } = json;
    console.log(artboards, elements);
  };

  toJSX = () => this.artboards.map((artboard) => artboard.toJSX());

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
      case 'json':
      case 'application/json':
        return await this.toJSON(options);

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

  toJSON = (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
    } = {},
  ) => {
    console.log(options);
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

          this.artboards[idx].configure(config);

          const graphic = await doc.parseJsx(this.artboards[idx].toJSX());

          const page = pdfDoc.addPage(this.artboards[idx].size);
          const h = page.getHeight();

          page.draw(graphic, { x: 0, y: h });

          switch (responseType) {
            case 'base64':
              return await pdfDoc.saveAsBase64();
            case 'dataUri':
              return await pdfDoc.saveAsBase64({ dataUri: true });
            case 'binary':
              return Buffer.from(
                await pdfDoc.saveAsBase64(),
                'base64',
              ).toString('binary');
            case 'binary':
              return Buffer.from(
                await pdfDoc.saveAsBase64(),
                'base64',
              ).toString();
            case 'arrayBuffer':
            default:
              return await pdfDoc.save();
          }
        }),
      )) as (string | ArrayBuffer)[];
    }

    const doc = await PDFDocument.create();

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
      const pages = configs.map((config: any, index: number) => ({
        page: doc.addPage(this.artboards[index % this.artboards.length].size),
        config,
      }));

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
          const page = doc.addPage(artboard.size);
          const h = page.getHeight();

          drawables[index].forEach(({ graphic }) =>
            page.draw(graphic, { x: 0, y: h }),
          );
        }),
      );
    }

    switch (responseType) {
      case 'base64':
        return array ? [await doc.saveAsBase64()] : await doc.saveAsBase64();
      case 'dataUri':
        return array
          ? [await doc.saveAsBase64({ dataUri: true })]
          : await doc.saveAsBase64({ dataUri: true });
      case 'binary':
        return array
          ? [Buffer.from(await doc.saveAsBase64(), 'base64').toString('binary')]
          : Buffer.from(await doc.saveAsBase64(), 'base64').toString('binary');
      case 'binary':
        return array
          ? [Buffer.from(await doc.saveAsBase64(), 'base64').toString()]
          : Buffer.from(await doc.saveAsBase64(), 'base64').toString();
      case 'arrayBuffer':
      default:
        return array ? [await doc.save()] : await doc.save();
    }
  };

  toSVG = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      array?: boolean;
    } = {},
  ) => {
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
    if (this.artboards.length === 0) {
      throw new Error('Workspace is emtpty, no art boards found');
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
    if (this.artboards.length === 0) {
      throw new Error('Workspace is emtpty, no art boards found');
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
