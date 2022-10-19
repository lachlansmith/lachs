import React from 'react';

const Ellipse = (props: {
  rx: number;
  ry: number;
  fill: string;
  stroke: string;
  strokeWidth: string;
}) => {
  const { rx, ry } = props;
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox={'0 0 ' + 2 * rx + ' ' + 2 * ry}
    >
      <ellipse rx={rx} ry={ry} />
    </svg>
  );
};

export default Ellipse;
