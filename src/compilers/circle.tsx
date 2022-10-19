import React from 'react';

const Circle = (props: {
  radius: string;
  fill: string;
  stroke: string;
  strokeWidth: string;
}) => {
  const { radius, fill, stroke, strokeWidth } = props;
  const r = parseFloat(radius);
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox={'0 0 ' + 2 * r + ' ' + 2 * r}
    >
      <circle
        cx={r}
        cy={r}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};

export default Circle;
