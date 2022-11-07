import React from 'react';
import { Buffer } from 'buffer';
import { renderToString } from 'react-dom/server';
import { PDFDocument, PDFPage } from 'lachs-pdf-lib';

import { Element } from 'src/core';
import { format, drawContext } from 'src/utils';

import { methods } from '..';

export default class Artboard {
  meta: any;

  size: [number, number];
  elements: Element[];

  methods: {
    name: string;
    compiler: (props: any) => JSX.Element;
    configurer?: (props: any, config: any) => any;
  }[];

  document?: PDFDocument;

  constructor(size: [number, number]) {
    this.meta = {};

    this.size = size;
    this.elements = [];

    this.methods = [];
    Object.entries(methods).forEach(([name, method]) =>
      this.addMethod(name, method.compiler, method.configurer),
    );
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
    configurer?: (props: any, config: any) => any,
  ): Element => {
    const element = new Element(props, compiler, configurer);

    this.elements.push(element);

    return element;
  };

  addMethod = (
    name: string,
    compiler: (props: any) => JSX.Element,
    configurer?: (props: any, config: any) => any,
  ) => {
    (this as any)[name] = (props: any = {}) =>
      this.addElement(props, compiler, configurer);

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

  from = async (pdf: ArrayBuffer): Promise<Artboard> => {
    const document = await PDFDocument.load(pdf);
    const { width, height } = document.getPage(0).getSize();
    const artboard = new Artboard([width, height]);

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

          const buf = await doc.save();

          if (responseType && responseType !== 'arrayBuffer') {
            return format('application/pdf', Buffer.from(buf), responseType); // Buffer is faster than doc.saveAsBase64
          }

          return buf;
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

    const arrayBuffer = await doc.save();

    if (responseType && responseType !== 'arrayBuffer') {
      return format('application/pdf', Buffer.from(arrayBuffer), responseType); // Buffer is faster than doc.saveAsBase64
    }

    return arrayBuffer;
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
          const uri = cnv.toDataURL('image/png');

          if (responseType && responseType !== 'dataUri') {
            const output = Buffer.from(uri.split(';base64,')[1], 'base64');

            return format('image/png', output, responseType);
          }

          return uri;
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

          return uri;
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
          const uri = cnv.toDataURL('image/webp');

          if (responseType && responseType !== 'dataUri') {
            const output = Buffer.from(uri.split(';base64,')[1], 'base64');

            return format('image/png', output, responseType);
          }

          return uri;
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
