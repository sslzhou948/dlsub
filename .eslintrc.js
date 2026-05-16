module.exports = {
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
    jest: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-eval': 'error',
    'no-unused-vars': 'warn',
  },
};
