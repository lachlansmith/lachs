import React from 'react';

const Ellipse = (props: any) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox={'0 0 ' + 2 * props.rx + ' ' + 2 * props.ry}
  >
    <ellipse {...props} />
  </svg>
);

export default Ellipse;
