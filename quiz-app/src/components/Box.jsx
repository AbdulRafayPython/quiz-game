/**
 * Box — absolutely positions an element at exact Figma coordinates (design px)
 * inside a <Stage>. Renders an <img> when `img` is given, otherwise a text/box
 * element. Pass `onClick` to make it interactive (defaults to a <button>).
 *
 * Props:
 *   x, y, w, h   position + size in design px
 *   img, alt     image source (rendered to fill the box)
 *   as           override tag ('div' | 'button' | 'span' | 'img' ...)
 *   onClick      click handler (auto-uses <button> if `as` not set)
 *   color, size  text color + font-size (px)
 *   weight       font-weight (default 700); `regular` => 400
 *   align        horizontal text align: 'left' | 'center' | 'right'
 *   valign       'top' | 'center' (vertical centering via flex)
 *   lh           explicit line-height (px)
 *   upper        uppercase text
 *   fit          object-fit for images ('fill' default | 'cover' | 'contain')
 */
export default function Box({
  x, y, w, h,
  img, alt = '',
  as,
  onClick,
  color,
  size,
  weight = 700,
  regular = false,
  align = 'left',
  valign = 'top',
  lh,
  upper = false,
  fit = 'fill',
  className = '',
  style = {},
  children,
  ...rest
}) {
  const base = {
    position: 'absolute',
    left: x,
    top: y,
    width: w,
    height: h,
  };

  if (img) {
    return (
      <img
        src={img}
        alt={alt}
        draggable={false}
        onClick={onClick}
        className={className}
        style={{
          ...base,
          objectFit: fit,
          cursor: onClick ? 'pointer' : 'default',
          ...style,
        }}
        {...rest}
      />
    );
  }

  const Comp = as || (onClick ? 'button' : 'div');
  const textStyle = {
    ...base,
    fontFamily: "'Space Mono', monospace",
    fontWeight: regular ? 400 : weight,
    fontSize: size,
    color,
    textAlign: align,
    textTransform: upper ? 'uppercase' : 'none',
    lineHeight: lh ? `${lh}px` : valign === 'center' ? `${h}px` : 1.15,
    display: valign === 'center' || align === 'center' || align === 'right' ? 'flex' : 'block',
    alignItems: valign === 'center' ? 'center' : 'flex-start',
    justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
    whiteSpace: 'pre-line',
    cursor: onClick ? 'pointer' : 'default',
    background: 'none',
    border: 'none',
    padding: 0,
    ...style,
  };

  return (
    <Comp onClick={onClick} className={className} style={textStyle} {...rest}>
      {children}
    </Comp>
  );
}

/** Asset path helper for the exact Figma-exported images. */
export const A = (name) => `/assets/figma/${name}`;
