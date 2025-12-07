import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

function applySourceMetadata(root, result) {
  const defaultFrom = result.opts.from || "client/src/index.css";
  if (!result.opts.from) {
    result.opts.from = defaultFrom;
  }

  const input = root.source?.input;
  const normalizedInput = input ?? { file: defaultFrom };
  if (normalizedInput && !normalizedInput.file) {
    normalizedInput.file = defaultFrom;
  }
  if (!root.source) {
    root.source = { input: normalizedInput };
  } else if (!root.source.input) {
    root.source.input = normalizedInput;
  }

  root.walk((node) => {
    if (!node.source) {
      node.source = { input: normalizedInput };
    } else if (!node.source.input) {
      node.source.input = normalizedInput;
    }
  });
}

// Tiny guard plugin to enforce a `from` value and silence PostCSS warnings
const ensureFrom = () => ({
  postcssPlugin: "ensure-from",
  Once(root, { result }) {
    applySourceMetadata(root, result);
  },
  OnceExit(root, { result }) {
    applySourceMetadata(root, result);
  },
});
ensureFrom.postcss = true;

export default {
  from: "client/src/index.css",
  plugins: [tailwindcss(), autoprefixer(), ensureFrom()],
  map: false,
};
