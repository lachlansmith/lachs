import React from 'react';

const Circle = (props: any) => {
  const r = parseFloat(props.r);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={'0 0 ' + 2 * r + ' ' + 2 * r}
    >
      <circle {...props} />
    </svg>
  );
};

export default Circle;
