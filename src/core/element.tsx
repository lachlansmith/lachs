import React from 'react';
import { Buffer } from 'buffer';
import { PDFDocument } from 'lachs-pdf-lib';
import { renderToString } from 'react-dom/server';

import { format, drawContext } from 'src/utils';

export default class Element {
  meta?: any;

  defprops: any;
  compiler: (props: any) => JSX.Element;
  configurer?: (props: any, config: any) => any;

  props: any;
  cached: boolean;

  component: any;

  x: number;
  y: number;

  width: number;
  height: number;

  scale: number;

  anchor:
    | 'top left'
    | 'top middle'
    | 'top right'
    | 'center left'
    | 'center middle'
    | 'center right'
    | 'bottom left'
    | 'bottom middle'
    | 'bottom right';

  constructor(
    props: any = {},
    compiler: (props: any) => JSX.Element,
    configurer?: (props: any, config: any) => any,
  ) {
    this.meta = {};

    this.defprops = props;
    this.compiler = compiler;
    this.configurer = configurer;

    this.props = props;
    this.cached = false;

    this.x = 0;
    this.y = 0;

    this.width = 0;
    this.height = 0;

    this.scale = 1;

    this.anchor = 'top left';
  }

  compile = () => {
    const component = this.compiler(this.props);

    if (component.type !== 'svg') {
      throw new Error(
        'Compiler returned JSX element ' +
          component.type +
          " that's not an svg",
      );
    }

    const bbox = component.props.viewBox.split(' ');

    this.width = (bbox[2] - bbox[0]) * this.scale;
    this.height = (bbox[3] - bbox[1]) * this.scale;

    let x = this.x;
    let y = this.y;

    if (this.anchor !== 'top left') {
      if (this.anchor.includes('middle')) {
        x -= this.width / 2;
      }

      if (this.anchor.includes('right')) {
        x -= this.width;
      }

      if (this.anchor.includes('center')) {
        y -= this.height / 2;
      }

      if (this.anchor.includes('bottom')) {
        y -= this.height;
      }
    }

    let transform = '';
    if (x !== 0 || y !== 0) {
      transform += 'translate(' + x + ',' + y + ') ';
    }

    if (this.scale !== 1) {
      transform += 'scale(' + this.scale + ')';
    }

    if (transform !== '') {
      this.component = React.cloneElement(component, {
        ...component.props,
        children: <g transform={transform}>{component.props.children}</g>,
      });
    } else {
      this.component = component;
    }

    this.cached = true;

    return this;
  };

  configure = (config?: any) => {
    if (!config || Object.keys(config).length === 0 || !this.configurer) {
      return this;
    }

    this.props = this.configurer(this.defprops, config);
    this.cached = false;

    return this;
  };

  getSize = (): [number, number] => {
    if (!this.cached) this.compile();
    return [this.width, this.height];
  };

  transform = (
    transform: {
      x?: number;
      y?: number;
      scale?: number;
      anchor?:
        | 'top left'
        | 'top middle'
        | 'top right'
        | 'center left'
        | 'center middle'
        | 'center right'
        | 'bottom left'
        | 'bottom middle'
        | 'bottom right';
    } = {},
  ) => {
    const { x, y, scale, anchor } = transform;

    if (x) {
      this.x += x;
    }

    if (y) {
      this.y += y;
    }

    if (scale) {
      this.scale = this.scale * scale;
    }

    if (anchor) {
      this.anchor = anchor;
    }

    return this;
  };

  toJSX = () => {
    if (!this.cached) this.compile();
    return this.component;
  };

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

    canvas.width = this.width * 4;
    canvas.height = this.height * 4;
    canvas.style.width = this.width.toString();
    canvas.style.height = this.height.toString();

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
      background?: string;
    } = {},
  ) => {
    switch (type) {
      //   case 'json':
      //   case 'application/json':
      //     return await this.toJSON();

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
        return await this.toPNG(options);

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
      background?: string;
    } = {},
  ) => {
    const { responseType } = options;

    const doc = await PDFDocument.create();

    const page = doc.addPage(this.getSize());
    const h = page.getHeight();

    const graphic = await doc.parseJsx(this.toJSX());
    page.draw(graphic, { x: 0, y: h });

    switch (responseType) {
      case 'base64':
        return await doc.saveAsBase64();
      case 'dataUri':
        return await doc.saveAsBase64({ dataUri: true });
      case 'binary':
        return Buffer.from(await doc.saveAsBase64(), 'base64').toString(
          'binary',
        );
      case 'string':
        return Buffer.from(await doc.saveAsBase64(), 'base64').toString();
      case 'arrayBuffer':
      default:
        return await doc.save();
    }
  };

  toSVG = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      background?: string;
    } = {},
  ) => {
    const { responseType, configs } = options;

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
      '<?xml version="1.0" encoding="UTF-8"?>' +
      renderToString(await this.toJSX());

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
    const { responseType, configs } = options;

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

      return format('image/jpeg', output, responseType);
    }

    return dataUri;
  };

  toJPEG = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri';
      background?: string;
    } = {},
  ) => {
    const { responseType, configs } = options;

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
    const { responseType, configs } = options;

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
