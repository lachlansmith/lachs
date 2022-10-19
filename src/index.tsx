export * from 'src/core';
export * from 'src/compilers';

export const setProps = (changeSet: any, props: any) => {
  Object.keys(changeSet).forEach((key) => {
    if (!Object.keys(props).includes(key)) {
      throw new Error(
        "setProps: New prop '" + key + "' does not exist in props",
      );
    }
  });

  return {
    ...props,
    ...changeSet,
  };
};
