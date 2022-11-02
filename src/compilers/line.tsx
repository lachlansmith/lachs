import React from 'react';

const Line = (props: any) => {
  const width = props.x2 - props.x1;
  const height = props.y2 - props.y1;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={'0 0 ' + width + ' ' + height}
    >
      <line {...props} />
    </svg>
  );
};

export default Line;
