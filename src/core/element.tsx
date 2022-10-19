import React from 'react';
import { Buffer } from 'buffer';
import { PDFDocument } from 'lachs-pdf-lib';
import { renderToString } from 'react-dom/server';

import { format } from 'src/utils/format';
import { drawContext } from 'src/utils/canvas';

class Element {
  type: string;
  name: string;
  position?: number;
  board?: number;
  meta?: any;

  compiler: (props: any) => JSX.Element;
  defprops: any;

  configurer?: (props: any, config: any) => any;
  defconfig?: any;

  props: any;
  cached: boolean;
  visible: boolean;

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
    name: string,
    compiler: (props: any) => JSX.Element,
    props: any = {},
    configurer?: (props: any, config: any) => any,
  ) {
    this.type = 'shape';
    this.name = name;

    this.compiler = compiler;
    this.defprops = props;
    this.configurer = configurer;

    this.props = props;
    this.cached = false;
    this.visible = true;

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

    let x = this.x;
    let y = this.y;

    let bbox = [];
    if (component.props.viewBox) {
      bbox = component.props.viewBox.split(' ');
    }

    if (component.props.viewbox) {
      bbox = component.props.viewbox.split(' ');
    }

    this.width = (bbox[2] - bbox[0]) * this.scale;
    this.height = (bbox[3] - bbox[1]) * this.scale;

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

    this.component = React.cloneElement(component, {
      ...component.props,
      children: transform ? (
        <g transform={transform}>{component.props.children}</g>
      ) : (
        component.props.children
      ),
    });

    this.cached = true;

    return this;
  };

  configure = (config: any = {}) => {
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
      responseType?: 'string' | 'base64' | 'arrayBuffer' | 'dataUri';
      background?: string;
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
      responseType?: 'string' | 'base64' | 'arrayBuffer' | 'dataUri';
    } = {},
  ) => {
    const { responseType } = options;

    const json = {
      method: { name: this.name, type: this.type },
      position: this.position,
      board: this.board,
      meta: this.meta,
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
      responseType?: 'string' | 'base64' | 'arrayBuffer' | 'dataUri';
      background?: string;
    } = {},
  ) => {
    const { responseType } = options;

    const doc = await PDFDocument.create();

    if (this.defconfig) this.configure(this.defconfig);
    const page = doc.addPage(this.getSize());
    const h = page.getHeight();

    const jsx = this.toJSX();
    const graphic = await doc.parseJsx(jsx);
    page.draw(graphic, { x: 0, y: h });

    const arrayBuffer = await doc.save();
    const output = Buffer.from(arrayBuffer);

    return format('application/pdf', output, responseType);
  };

  toSVG = async (
    options: {
      configs?: any;
      responseType?: 'string' | 'base64' | 'arrayBuffer' | 'dataUri';
      background?: string;
    } = {},
  ) => {
    const { responseType } = options;

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
      responseType?: 'string' | 'base64' | 'arrayBuffer' | 'dataUri';
    } = {},
  ) => {
    const { responseType } = options;

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
      responseType?: 'string' | 'base64' | 'arrayBuffer' | 'dataUri';
      background?: string;
    } = {},
  ) => {
    const { responseType } = options;

    const canvas = await this.toCanvas({ background: '#FFFFFF' });
    const dataUri = canvas.toDataURL('image/jpeg');

    if (responseType && responseType !== 'dataUri') {
      const output = Buffer.from(dataUri.split(';base64,')[1], 'base64');

      return format('image/jpeg', output, responseType);
    }

    return dataUri;
  };
}

export default Element;
