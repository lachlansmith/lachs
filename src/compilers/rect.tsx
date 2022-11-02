import React from 'react';

const Rect = (props: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={'0 0 ' + props.width + ' ' + props.height}
    >
      <rect {...props} />
    </svg>
  );
};

export default Rect;
