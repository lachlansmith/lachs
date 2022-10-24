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
  meta?: any;
  methods: {
    name: string;
    compiler: (props: any) => JSX.Element;
    configurer?: (props: any, config: any) => any;
  }[];
  elements: Element[];

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

  dump = (json: {
    elements: {
      method: { name: string; type: 'Shape' };
      defprops: any;
      defconfig: any;
    }[];
  }) => {
    const { elements } = json;

    for (const element of elements) {
      const { method, defprops } = element;
      this.add(
        method.name,
        this.methods.filter((m) => method.name === m.name)[0].compiler,
        defprops,
      );
    }
  };

  configure = async (config: any) => {
    if (!config || Object.keys(config).length === 0) {
      return this;
    }

    await Promise.all(
      this.elements.map(async (element: Element) => element.configure(config)),
    );

    return this;
  };

  add = (
    name: string,
    compiler: (props: any) => JSX.Element,
    props: any = {},
    configurer?: (props: any, config: any) => any,
  ): Element => {
    const element = new Element(name, compiler, props, configurer);

    this.elements.push(element);

    return element;
  };

  addMethod = (
    name: string,
    compiler: (props: any) => JSX.Element,
    configurer?: (props: any, config: any) => any,
  ) => {
    (this as any)[name] = (props: any = {}) =>
      this.add(name, compiler, props, configurer);

    this.methods.push({ name, compiler, configurer });
  };

  move = (element: Element, position: number) => {
    if (element.board !== this.index) {
      throw new Error(
        "Element from another artboard can't be moved to this artboard",
      );
    }

    if (element.position) {
      this.elements.splice(element.position, 1);
    }

    this.elements.splice(position, 0, element);
    for (let i = position + 1; i < this.elements.length; i++) {
      this.elements[i].position = i;
    }

    element.position = position;
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

          const arrBuf = await pdfDoc.save();

          if (responseType && responseType !== 'arrayBuffer') {
            const output = Buffer.from(arrBuf);

            return format('application/pdf', output, responseType);
          }

          return arrBuf;
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
      const output = Buffer.from(arrayBuffer);

      return format('application/pdf', output, responseType);
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

    let dataUri = '';

    if (configs) {
      return (await Promise.all(
        configs.map(async (config: any) => {
          await this.configure(config);

          const cnv = await this.toCanvas();
          dataUri = cnv.toDataURL('image/png');

          if (responseType && responseType !== 'dataUri') {
            const output = Buffer.from(dataUri.split(';base64,')[1], 'base64');

            return format('image/png', output, responseType);
          }

          return dataUri;
        }),
      )) as string[] | ArrayBuffer[];
    }

    const canvas = await this.toCanvas();
    dataUri = canvas.toDataURL('image/png');

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
}

