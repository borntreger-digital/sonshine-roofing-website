import js from '@eslint/js';
import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from '@eslint-react/eslint-plugin';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import-x';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y-x';
import nextPlugin from '@next/eslint-plugin-next';

// Retain the former React preset's raw JSX text check, which has no replacement.
const jsxTextPlugin = {
  rules: {
    'no-unescaped-entities': {
      meta: { type: 'problem', schema: [], messages: { escape: 'Escape {{character}} in JSX text with an HTML entity or expression.' } },
      create(context) {
        return {
          JSXText(node) {
            for (const match of context.sourceCode.getText(node).matchAll(/["'>}]/g)) {
              const start = context.sourceCode.getLocFromIndex(node.range[0] + match.index);
              context.report({ node, loc: { start, end: { ...start, column: start.column + 1 } }, messageId: 'escape', data: { character: match[0] } });
            }
          },
        };
      },
    },
  },
};
const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.d.ts'];
const tsRecommended = tsPlugin.configs['flat/recommended'];
const config = [
  { ignores: ['.next/**', '.cloudflare/**', 'dist/**', 'node_modules/**', 'next-env.d.ts'] },
  {
    name: 'sonshine/base',
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@next/next': nextPlugin,
      'import-x': importPlugin,
      '@eslint-react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y-x': jsxA11yPlugin,
      'sonshine': jsxTextPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...Object.fromEntries(Object.entries(reactHooksPlugin.configs.recommended.rules).map(([rule, level]) => [rule, ['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps'].includes(rule) ? level : 'warn'])),
      'no-empty': ['error', { allowEmptyCatch: true }],
      'import-x/no-anonymous-default-export': 'warn',
      '@eslint-react/no-missing-component-display-name': 'error',
      '@eslint-react/no-missing-key': 'error',
      '@eslint-react/no-duplicate-key': 'error',
      '@eslint-react/jsx-no-comment-textnodes': 'error',
      '@eslint-react/jsx-no-children-prop': 'error',
      '@eslint-react/dom-no-dangerously-set-innerhtml-with-children': 'error',
      '@eslint-react/dom-no-find-dom-node': 'error',
      '@eslint-react/dom-no-render-return-value': 'error',
      '@eslint-react/dom-no-render': 'error',
      '@eslint-react/dom-no-hydrate': 'error',
      // Existing code uses function components. This retains the safety previously
      // supplied by deprecated class lifecycle/state rules for future additions.
      '@eslint-react/no-class-component': 'error',
      'sonshine/no-unescaped-entities': 'error',
      'jsx-a11y-x/alt-text': ['warn', { elements: ['img'], img: ['Image'] }],
      'jsx-a11y-x/aria-props': 'warn',
      'jsx-a11y-x/aria-proptypes': 'warn',
      'jsx-a11y-x/aria-unsupported-elements': 'warn',
      'jsx-a11y-x/role-has-required-aria-props': 'warn',
      'jsx-a11y-x/role-supports-aria-props': 'warn',
    },
  },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
  ...tsRecommended.map(config => ({ ...config, files: tsFiles })),
  {
    files: tsFiles,
    languageOptions: { parser: tsParser, parserOptions: { project: null } },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
];

export default config;
