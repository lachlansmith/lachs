import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';

const { MINIFY, MODULE_TYPE } = process.env;

const IgnoredWarnings = [
  // Mac & Linux
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/PDFFont.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/PDFImage.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/PDFPage.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFPage.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/PDFPage.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/PDFEmbeddedPage.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/form/PDFForm.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/form/index.js -> node_modules/lachs-pdf-lib/es/api/form/PDFButton.js -> node_modules/lachs-pdf-lib/es/api/form/PDFField.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/form/index.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/form/PDFButton.js -> node_modules/lachs-pdf-lib/es/api/PDFPage.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/form/PDFForm.js -> node_modules/lachs-pdf-lib/es/api/form/PDFButton.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFPage.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/form/PDFForm.js -> node_modules/lachs-pdf-lib/es/api/form/PDFCheckBox.js -> node_modules/lachs-pdf-lib/es/api/PDFPage.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/form/PDFForm.js -> node_modules/lachs-pdf-lib/es/api/form/PDFCheckBox.js -> node_modules/lachs-pdf-lib/es/api/form/PDFField.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFPage.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/form/PDFForm.js -> node_modules/lachs-pdf-lib/es/api/form/PDFDropdown.js -> node_modules/lachs-pdf-lib/es/api/PDFPage.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFPage.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/form/PDFForm.js -> node_modules/lachs-pdf-lib/es/api/form/PDFOptionList.js -> node_modules/lachs-pdf-lib/es/api/PDFPage.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFPage.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/form/PDFForm.js -> node_modules/lachs-pdf-lib/es/api/form/PDFRadioGroup.js -> node_modules/lachs-pdf-lib/es/api/PDFPage.js',
  'Circular dependency: node_modules/lachs-pdf-lib/es/api/PDFPage.js -> node_modules/lachs-pdf-lib/es/api/PDFDocument.js -> node_modules/lachs-pdf-lib/es/api/form/PDFForm.js -> node_modules/lachs-pdf-lib/es/api/form/PDFTextField.js -> node_modules/lachs-pdf-lib/es/api/PDFPage.js',
  'Circular dependency: es/core/index.js -> es/core/workspace.js -> es/core/artboard.js -> es/core/index.js',
  'Circular dependency: es/core/index.js -> es/core/workspace.js -> es/core/index.js',

  // Windows
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFFont.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFImage.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFEmbeddedPage.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFForm.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\form\\index.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFButton.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFField.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\index.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFButton.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFForm.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFButton.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFForm.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFCheckBox.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFForm.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFCheckBox.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFField.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFForm.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFDropdown.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFForm.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFOptionList.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFForm.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFRadioGroup.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js',
  'Circular dependency: node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFDocument.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFForm.js -> node_modules\\lachs-pdf-lib\\es\\api\\form\\PDFTextField.js -> node_modules\\lachs-pdf-lib\\es\\api\\PDFPage.js',
  'Circular dependency: es\\core\\index.js -> es\\core\\workspace.js -> es\\core\\artboard.js -> es\\core\\index.js',
  'Circular dependency: es\\core\\index.js -> es\\core\\workspace.js -> es\\core\\index.js',
];

// Silence circular dependency warnings we don't care about
const onwarn = (warning, warn) => {
  if (IgnoredWarnings.includes(warning.message)) return;
  warn(warning);
};

export default {
  onwarn,
  input: 'es/index.js',
  output: {
    name: 'lachs',
    format: MODULE_TYPE,
    sourcemap: true,
  },
  plugins: [
    resolve({ preferBuiltins: false, browser: true }),
    commonjs(),
    json(),
    MINIFY === 'true' && terser(),
  ],
};
