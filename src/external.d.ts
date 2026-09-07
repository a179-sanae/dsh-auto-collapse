/** CSS is bundled as text into the client module; no separate stylesheet request is needed. */
declare module '*.css' {
  const value: string
  export default value
}

