/** True on phones and tablets (coarse pointer), where maps must not trap page scrolling. */
export const isTouch = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
