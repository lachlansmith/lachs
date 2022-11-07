export * from 'src/core';
export * from 'src/utils';

import Workspace from 'src/core/workspace';
import Artboard from 'src/core/artboard';
import Element from 'src/core/element';

export interface Lachs {
  [name: string]: any;
}

export interface Compilers {
  [name: string]: (props: any) => JSX.Element;
}

export const compilers: Compilers = {}; // syntax sugar: lachs.compilers[name]

export interface Configurers {
  [name: string]: (props: any, config: any) => any;
}

export const configurers: Configurers = {}; // syntax sugar: lachs.compilers[name]

export interface Methods {
  [name: string]: {
    compiler: (props: any) => JSX.Element;
    configurer?: (props: any, config: any) => any;
  };
}

export const methods: Methods = {}; // Initial methods available

export const addMethod = (
  name: string,
  compiler: (props: any) => JSX.Element,
  configurer?: (props: any, config: any) => any,
) => {
  methods[name] = { compiler, configurer };
  compilers[name] = compiler;
  configurers[name] = configurer;
};

export interface Packages {
  [name: string]: Methods;
}

export const addPackages = (packages: Packages) => {
  Object.entries(packages).forEach(([name, methods]) => {
    if (
      [
        'compilers',
        'configurers',
        'methods',
        'addMethod',
        'addPackages',
        'Workspace',
        'Artboard',
        'Element',
      ].includes(name)
    ) {
      throw new Error(
        `Lachs: Reserved keyword ${name} can't be used as package name`,
      );
    }

    Lachs[name] = methods;
    Object.entries(methods).forEach(([name, method]) =>
      addMethod(name, method.compiler, method.configurer),
    );
  });
};

const Lachs: Lachs = {
  compilers,
  configurers,
  methods,
  addMethod,
  addPackages,
  Workspace,
  Artboard,
  Element,
};

export default Lachs;
