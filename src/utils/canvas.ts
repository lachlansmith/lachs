import Artboard from 'src/core/artboard';
import Element from 'src/core/element';

export const drawContext = async (
  ctx: CanvasRenderingContext2D,
  artwork: Element | Artboard,
) => {
  if (!ctx) {
    throw new Error('Failed load context');
  }

  const img = document.createElement('img');
  img.setAttribute(
    'src',
    (await artwork.toSVG({ responseType: 'dataUri' })) as string,
  );

  return new Promise((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      resolve(img);
    };
  });
};
