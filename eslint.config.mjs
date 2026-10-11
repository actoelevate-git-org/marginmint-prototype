import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next@16 ships native flat configs; wrapping them in FlatCompat
// fails with a circular-structure error, so they are spread directly.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default eslintConfig;
