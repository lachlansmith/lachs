<div align="center">
  Convert <strong>svg</strong> JSX elements to PNG, JPEG, WEBP, SVG and PDF
</div>
<div align="center">
  Designed to work in any modern browser runtimes.
</div>

<br />

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Features](#features)
- [Usage](#usage)
  - [Elements](#elements)
  - [Artboards](#artboards)
  - [Workspaces](#workspaces)
  - [Globals](#globals)
  - [Advanced](#advanced)
    - [Configs](#configs)
    - [Modify](#modify)
  - [Download](#download)
- [Contributing](#contributing)
- [License](#license)

## Features

- Elements
  - JSX -> PNG | PNG[]
  - JSX -> JPEG | JPEG[]
  - JSX -> WEBP | WEBP[]
  - JSX -> SVG | SVG[]
  - JSX -> PDF | PDF[]
- Artboard
  - JSX -> PNG | PNG[]
  - JSX -> JPEG | JPEG[]
  - JSX -> WEBP | WEBP[]
  - JSX -> SVG | SVG[]
  - JSX -> PDF | PDF[]
- Workspace
  - JSX[] -> PNG | PNG[]
  - JSX[] -> JPEG | JPEG[]
  - JSX[] -> WEBP | WEBP[]
  - JSX[] -> SVG | SVG[]
  - JSX[] -> PDF | PDF[]
- Response types
  - arrayBuffer
  - base64
  - dataUri
  - binary
  - string
- Advanced
  - Export based on list of JSON configs
  - Modify existing PDFs -> PDF, JPEG, PNG and WEBP

## Usage

### Elements

An element is constructed with properties and compiler. The compiler is a react hook function that returns an SVG JSX element. At a minimum xmlns and viewbox must be provided. An element can be exported to PDF, SVG, PNG, JPEG and WEBP.

```js
import { Element } from 'lachs';
import QRCode from 'qrcode';
import bbox from 'svg-path-bbox';

const compiler = (props: {
  url: string,
  errorCorrectionLevel?: QRCode.QRCodeErrorCorrectionLevel,
  version?: number,
  stroke?: string,
}): JSX.Element => {
  const qrcode = QRCode.create(props.url, {
    errorCorrectionLevel: props.errorCorrectionLevel,
    version: props.version,
  });

  const cmd = (cmd: string, x: number, y?: number) => {
    let str = cmd + x;
    if (typeof y !== 'undefined') str += ' ' + y;

    return str;
  };

  const { size, data } = qrcode.modules;

  let d = '';
  let moveBy = 0;
  let newRow = false;
  let lineLength = 0;

  for (let i = 0; i < data.length; i++) {
    const col = Math.floor(i % size);
    const row = Math.floor(i / size);

    if (!col && !newRow) newRow = true;

    if (data[i]) {
      lineLength++;

      if (!(i > 0 && col > 0 && data[i - 1])) {
        d += newRow ? cmd('M', col, 0.5 + row) : cmd('m', moveBy, 0);

        moveBy = 0;
        newRow = false;
      }

      if (!(col + 1 < size && data[i + 1])) {
        d += cmd('h', lineLength);
        lineLength = 0;
      }
    } else {
      moveBy++;
    }
  }

  const viewBox = bbox(d);
  const height = viewBox[3] - viewBox[1];
  const width = viewBox[2] - viewBox[0];

  const { stroke } = props;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={'0 0 ' + width + ' ' + height}
    >
      <path d={d} fill="none" stroke={stroke} />
    </svg>
  );
};

const element = new Element(
  {
    url: 'https://github.com/lachlansmith/lachs',
    errorCorrectionLevel: 'H',
    stroke: 'black',
  },
  compiler,
);

const PDF = await element.toPDF(); // arrayBuffer
const SVG = await element.toSVG(); // string
const PNG = await element.toPNG(); // dataUri
const JPEG = await element.toJPEG({ responseType: 'arrayBuffer' }); // arrayBuffer
const WEBP = await element.toWEBP({ responseType: 'base64' }); // base64
```

### Artboards

```js
import { Artboard, BoardSizes } from 'lachs';
import opentype from 'opentype.js';

const [width, height] = BoardSizes.A4;

const artboard = new Artboard([width, height]);

artboard.addMethod(
  'text',
  (props: {
    text: string,
    font: ArrayBuffer,
    fontSize: number,
    fill: string,
  }): JSX.Element => {
    const { text, font, fontSize, fill } = props;

    const f = opentype.parse(font);
    const d = f.getPath(text, 0, 0, fontSize).toPathData(3);

    const viewBox = bbox(d);
    const height = viewBox[3] - viewBox[1];
    const width = viewBox[2] - viewBox[0];

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={'0 0 ' + width + ' ' + height}
      >
        <path fill={fill} d={d} />
      </svg>
    );
  },
);

const font = await axios.get(
  'https://urloftheTTForOTForWOFFfile.com/font.ttf',
  {
    responseType: 'arrayBuffer',
  },
);

artboard
  .text({
    text: 'Hello World',
    font: font,
    fontSize: 32,
    fill: '#FF0000',
  })
  .transform({
    x: width / 2,
    y: height / 2,
    anchor: 'center middle',
  });

const PDF = await artboard.to('application/pdf'); // arrayBuffer
const SVG = await artboard.to('image/svg+xml'); // string
const PNG = await artboard.to('image/png'); // dataUri
const JPEG = await artboard.to('image/jpeg', { responseType: 'arrayBuffer' }); // arrayBuffer
const WEBP = await artboard.to('image/webp', { responseType: 'base64' }); // base64
```

### Workspaces

```js
import lachs, { BoardSizes } from 'lachs';
import { qrcode, text } from './myCompilers';

const workspace = new lachs.Workspace();

workspace.addMethod('qrcode', qrcode);
workspace.addMethod('text', text);

const artboard = workspace.addArtboard(BoardSize.A1);

const qrcodeElement = artboard.qrcode({
  url: 'Welcome',
});

workspace.addArtboard(BoardSize.A5);

const textElement = workspace.artboards[1].text({
  text: 'Welcome',
  font: font,
  fontSize: 20,
});

textElement.transform({
  x: qrcodeElement.width + 20,
});

const PDFs = await workspace.toPDF({ individual: true }); // arrayBuffer[]
const SVGs = await workspace.to('svg'); // string[]
const PNGs = await workspace.to('image/png'); // dataUri[]
const JPEGs = await workspace.to('image/jpg', { responseType: 'arrayBuffer' }); // arrayBuffer[]
const WEBPs = await workspace.toWEBP({ responseType: 'base64' }); // base64[]
```

### Globals

Given lachs list of compilers is empty by default this might be annoying if you use certain methods often. Here's how you might add all basic svg shapes to lachs.

```js
import lachs, { BoardSizes } from 'lachs';

lachs.addMethod('circle', lachs.compilers.circle);
lachs.addMethod('ellipse', lachs.compilers.ellipse);
lachs.addMethod('line', lachs.compilers.line);
lachs.addMethod('rect', lachs.compilers.rect);
lachs.addMethod('path', lachs.compilers.path);
lachs.addMethod('polygon', lachs.compilers.polygon);
lachs.addMethod('polyline', lachs.compilers.polyline);

const workspace = new Workspace();
const artboard1 = workspace.addArtboard(BoardSizes.A4);

// no need to call add method on workspace or artboards

artboard1.circle({ ... });
artboard1.ellipse({ ... });

const artboard2 = workspace.addArtboard(BoardSizes.A4);

artboard2.line({ ... });
artboard2.rect({ ... });

const PDF = await workspace.toPDF()
```

### Advanced

#### Configs

Largely the reason this package was created was to enable easy propagation of drawings based on high level JSON configs. The _configs_ option is available on all **Element**, **Artboard** and **Workspace** `.to*` methods. For an element to _configure_ based on configs it must have a configurer.

```js
import lachs, { setProps } from 'lachs';
import { text } from './myCompilers';

const workspace = new Workspace();

workspace.addMethod('text', text);

const artboard = workspace.addArtboard([300, 300]);

const variableText = artboard.text({ text: 'Replace # with number' });
variableText.configurer = (props: any, config: any): any =>
  setProps({ text: props.text.replace('#', config.number) }, props);

let configs = [];
for (let n = 1; n < 20; n++) {
  const config = { number: n.toString() };
  configs.push(config);
}

const PDF = await workspace.to('application/pdf', { configs: configs }); // arrayBuffer
```

#### Modify

```js

```

### Download

```js

import JSZip from "jszip";
import { saveAs } from "file-saver";

interface Extension {
  [mimeType: string]: string;
}

const ext: Extension = {
  "application/pdf": "pdf",
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
};

const download = async (
workspace: Workspace,
mimeType:
    | "application/pdf"
    | "image/svg+xml"
    | "image/png"
    | "image/jpeg"
    | "image/webp"
) => {
    const output = (await workspace.to(mimeType, {
        responseType: "dataUri",
    })) as string | string[];

    if (output instanceof Array) {
        const zip = new JSZip();
        await Promise.all(
            output.map(async (base64, index) => {
                zip.file(
                    "artboard" + (index + 1) + "." + ext[mimeType],
                    base64.split(";base64,")[1],
                    {
                        base64: true,
                    }
                );
            })
        );

        zip.generateAsync({ type: "blob" }).then((content) => {
            saveAs(content, "workspace-" + ext[mimeType] + ".zip");
        });
    } else {
        saveAs(output, "workspace." + ext[mimeType]);
    }
};

```

## Contributing

We welcome contributions from the open source community! If you are interested in contributing to `lachs`, please take a look at the [CONTRIBUTING.md](docs/CONTRIBUTING.md) file.

## License

[MIT](LICENSE.md)
