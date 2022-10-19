import React from 'react';

const Line = (props: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: string;
}) => {
  const { x1, y1, x2, y2, stroke, strokeWidth } = props;
  const width = x2 - x1;
  const height = y2 - y1;
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox={'0 0 ' + width + ' ' + height}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};

export default Line;
