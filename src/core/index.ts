export { default as Workspace } from 'src/core/workspace';
export { default as Artboard } from 'src/core/artboard';
export { default as Element } from 'src/core/element';

export const methods: {
  name: string;
  compiler: (props: any) => JSX.Element;
  configurer?: (props: any, config: any) => any;
}[] = [];

export const addMethod = (
  name: string,
  compiler: (props: any) => JSX.Element,
  configurer?: (props: any, config: any) => any,
) => {
  methods.push({ name, compiler, configurer });
};
