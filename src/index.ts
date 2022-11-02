export * from 'src/compilers';
export { methods, Workspace, Artboard, Element } from 'src/core';
export * from 'src/utils';

import compilers from 'src/compilers';
import { addMethod, Workspace, Artboard, Element } from 'src/core';
export default {
  compilers,
  addMethod,
  Workspace,
  Artboard,
  Element,
};
