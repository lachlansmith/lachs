import React from 'react';
import { Buffer } from 'buffer';
import { renderToString } from 'react-dom/server';
import { PDFDocument, PDFPage } from 'lachs-pdf-lib';

import Element from 'src/core/element';
import { format } from 'src/utils/format';
import { drawContext } from 'src/utils/canvas';

import { methods } from 'src/core';

export default class Artboard {
  size: [number, number];
  index: number;
  methods: {
    name: string;
    compiler: (props: any) => JSX.Element;
    configurer?: (props: any, config: any) => any;
  }[];
  elements: Element[];
  document?: PDFDocument;

  constructor(size: [number, number], options: { index?: number } = {}) {
    const { index } = options;
    this.index = index ? index : 0;

    this.size = size;

    this.methods = [];
    this.elements = [];

    if (methods.length > 0) {
      methods.forEach(async ({ name, compiler, configurer }) =>
        this.addMethod(name, compiler, configurer),
      );
    }
  }

  configure = async (config: any) => {
    if (!config || Object.keys(config).length === 0) {
      return this;
    }

    await Promise.all(
      this.elements.map(async (element: Element) => element.configure(config)),
    );

    return this;
  };

  add = (element: Element) => {
    this.elements.push(element);
    return element;
  };

  addElement = (
    props: any = {},
    compiler: (props: any) => JSX.Element,
    options: { name: string; configurer?: (props: any, config: any) => any },
  ): Element => {
    const element = new Element(compiler, props, options);

    this.elements.push(element);

    return element;
  };

  addMethod = (
    name: string,
    compiler: (props: any) => JSX.Element,
    configurer?: (props: any, config: any) => any,
  ) => {
    (this as any)[name] = (props: any = {}) =>
      this.addElement(props, compiler, { name, configurer });

    this.methods.push({ name, compiler, configurer });
  };

  toJSX = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={'0 0 ' + this.size[0] + ' ' + this.size[1]}
    >
      {this.elements.map((element: Element) => {
        const component = element.toJSX();

        return <>{component.props.children}</>;
      })}
    </svg>
  );

  toCanvas = async (
    options: {
      background?: string;
    } = {},
  ) => {
    const { background } = options;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed load context');
    }

    canvas.width = this.size[0] * 4;
    canvas.height = this.size[1] * 4;
    canvas.style.width = this.size[0].toString();
    canvas.style.height = this.size[1].toString();

    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    await drawContext(ctx, this);

    return canvas;
  };

  from = async (pdf: ArrayBuffer, index?: number): Promise<Artboard> => {
    const document = await PDFDocument.load(pdf);
    const artboard = new Artboard(
      document.getPage(index ? index : 0).getSize(),
    );

    artboard.document = document;

    return artboard;
  };

  to = async (
    type: string,
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      individual?: boolean;
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
    const { responseType } = options;

    const json = {
      width: this.size[0],
      height: this.size[1],
      elements: this.elements.map((element) => element.toJSON()),
    };

    if (responseType) {
      const output = Buffer.from(JSON.stringify(json));

      return format('application/json', output, responseType);
    }

    return json;
  };

  toPDF = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      individual?: boolean;
    } = {},
  ) => {
    const { configs, responseType, individual } = options;

    if (configs && individual) {
      return (await Promise.all(
        configs.map(async (config: any) => {
          const pdfDoc = await PDFDocument.create();

          await this.configure(config);

          const graphic = await pdfDoc.parseJsx(this.toJSX());

          const page = pdfDoc.addPage(this.size);
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
            case 'string':
              return Buffer.from(
                await pdfDoc.saveAsBase64(),
                'base64',
              ).toString();
            case 'arrayBuffer':
            default:
              return await pdfDoc.save();
          }
        }),
      )) as string[] | ArrayBuffer[];
    }

    const doc = await PDFDocument.create();

    const drawables = await Promise.all(
      this.elements.map(async (element: Element) => ({
        element,
        graphic: await doc.parseJsx(element.toJSX()),
      })),
    );

    if (configs) {
      const pages = configs.map((config: any) => ({
        page: doc.addPage(this.size),
        config,
      }));

      await Promise.all(
        pages.map(async ({ page, config }: { page: PDFPage; config: any }) => {
          const h = page.getHeight();

          for (const drawable of drawables) {
            drawable.element.configure(config);

            if (drawable.element.cached) {
              page.draw(drawable.graphic, { x: 0, y: h });
              continue;
            }

            drawable.graphic = await doc.parseJsx(drawable.element.toJSX());
            page.draw(drawable.graphic, { x: 0, y: h });
          }
        }),
      );
    } else {
      const page = doc.addPage(this.size);
      const h = page.getHeight();
      drawables.forEach(({ graphic }) => page.draw(graphic, { x: 0, y: h }));
    }

    switch (responseType) {
      case 'base64':
        return await doc.saveAsBase64();
      case 'dataUri':
        return await doc.saveAsBase64({ dataUri: true });
      case 'binary':
        return Buffer.from(await doc.save()).toString('binary');
      case 'string':
        return Buffer.from(await doc.save()).toString();
      case 'arrayBuffer':
      default:
        return await doc.save();
    }
  };

  toSVG = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
    } = {},
  ) => {
    const { configs, responseType } = options;

    if (configs) {
      return (await Promise.all(
        configs.map(async (config: any) => {
          await this.configure(config);

          const svgString =
            '<?xml version="1.0" encoding="UTF-8"?>' +
            renderToString(this.toJSX());

          if (responseType && responseType !== 'string') {
            const output = Buffer.from(svgString);

            return format('image/svg+xml', output, responseType);
          }

          return svgString;
        }),
      )) as string[] | ArrayBuffer[];
    }

    const svg =
      '<?xml version="1.0" encoding="UTF-8"?>' + renderToString(this.toJSX());

    if (responseType && responseType !== 'string') {
      const output = Buffer.from(svg);

      return format('image/svg+xml', output, responseType);
    }

    return svg;
  };

  toPNG = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
    } = {},
  ) => {
    const { configs, responseType } = options;

    if (configs) {
      return (await Promise.all(
        configs.map(async (config: any) => {
          await this.configure(config);

          const cnv = await this.toCanvas();
          const dataUri = cnv.toDataURL('image/png');

          if (responseType && responseType !== 'dataUri') {
            const output = Buffer.from(dataUri.split(';base64,')[1], 'base64');

            return format('image/png', output, responseType);
          }

          return dataUri;
        }),
      )) as string[] | ArrayBuffer[];
    }

    const canvas = await this.toCanvas();
    const dataUri = canvas.toDataURL('image/png');

    if (responseType && responseType !== 'dataUri') {
      const output = Buffer.from(dataUri.split(';base64,')[1], 'base64');

      return format('image/png', output, responseType);
    }

    return dataUri;
  };

  toJPEG = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
    } = {},
  ) => {
    const { configs, responseType } = options;

    if (configs) {
      return (await Promise.all(
        configs.map(async (config: any) => {
          await this.configure(config);

          const cnv = await this.toCanvas({ background: '#FFFFFF' });
          const uri = cnv.toDataURL('image/jpeg');

          if (responseType && responseType !== 'dataUri') {
            const output = Buffer.from(uri.split(';base64,')[1], 'base64');

            return format('image/jpeg', output, responseType);
          }

          return dataUri;
        }),
      )) as string[] | ArrayBuffer[];
    }

    const canvas = await this.toCanvas({ background: '#FFFFFF' });
    const dataUri = canvas.toDataURL('image/jpeg');

    if (responseType && responseType !== 'dataUri') {
      const output = Buffer.from(dataUri.split(';base64,')[1], 'base64');

      return format('image/jpeg', output, responseType);
    }

    return dataUri;
  };

  toWEBP = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
    } = {},
  ) => {
    const { configs, responseType } = options;

    if (configs) {
      return (await Promise.all(
        configs.map(async (config: any) => {
          await this.configure(config);

          const cnv = await this.toCanvas();
          const dataUri = cnv.toDataURL('image/webp');

          if (responseType && responseType !== 'dataUri') {
            const output = Buffer.from(dataUri.split(';base64,')[1], 'base64');

            return format('image/png', output, responseType);
          }

          return dataUri;
        }),
      )) as string[] | ArrayBuffer[];
    }

    const canvas = await this.toCanvas();
    const dataUri = canvas.toDataURL('image/webp');

    if (responseType && responseType !== 'dataUri') {
      const output = Buffer.from(dataUri.split(';base64,')[1], 'base64');

      return format('image/webp', output, responseType);
    }

    return dataUri;
  };
}
