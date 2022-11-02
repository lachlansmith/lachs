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

```js
import { Element } from 'lachs';
```

### Artboards

```js

```

### Workspaces

```js

```

### Globals

If you have particular methods you always use they can be added globally. Here's how you might add all basic svg shapes to lachs

```js
import lachs from 'lachs';

lachs.addMethod('circle', lachs.compilers.circle);
lachs.addMethod('ellipse', lachs.compilers.ellipse);
lachs.addMethod('line', lachs.compilers.line);
lachs.addMethod('rect', lachs.compilers.rect);

const workspace = new Workspace();

const artboard = workspace.addArtboard(PageSizes.A4);
```

### Configs

```js

```

### Modify

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
