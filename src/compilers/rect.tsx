import React from 'react';

const Rect = (props: {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: string;
}) => {
  const { width, height } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={'0 0 ' + width + ' ' + height}
    >
      <rect width={width} height={height} />
    </svg>
  );
};

export default Rect;
