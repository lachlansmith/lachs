export * from 'src/compilers';
export * from 'src/core';
export * from 'src/utils';

import compilers from 'src/compilers';
import { methods, addMethod, Workspace, Artboard, Element } from 'src/core';
import { format, drawContext } from 'src/utils';

export default {
  compilers,
  methods,
  addMethod,
  Workspace,
  Artboard,
  Element,
  format,
  drawContext,
};
