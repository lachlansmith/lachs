export const setProps = (newprops: any, defprops: any) => {
  Object.keys(newprops).forEach((key) => {
    if (!Object.keys(defprops).includes(key)) {
      throw new Error(
        "useConfigurer: New prop '" + key + "' does not exist in props",
      );
    }
  });

  return {
    ...defprops,
    ...newprops,
  };
};

export const useConfigurer = (
  configuerer: (props: any, config: any) => any,
): ((props: any, config: any) => any) => configuerer;
