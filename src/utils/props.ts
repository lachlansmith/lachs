export const setProps = (newprops: any, defprops: any) => {
  Object.keys(newprops).forEach((key) => {
    if (!Object.keys(defprops).includes(key)) {
      throw new Error(
        'setProps: New prop \'' + key + '\' does not exist in props',
      );
    }
  });

  return {
    ...defprops,
    ...newprops,
  };
};
