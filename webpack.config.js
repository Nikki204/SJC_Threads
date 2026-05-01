const webpack = require('@nativescript/webpack');

module.exports = (env) => {
  webpack.init(env);

  // Fix: webpackbar (used by @nativescript/preview-cli) extends ProgressPlugin
  // and stores its own options (name, color, reporter) on this.options.
  // ProgressPlugin.apply() validates this.options against a schema with
  // additionalProperties: false, which rejects the webpackbar-specific keys.
  // Node.js v22 is stricter about this validation. Setting validate: false
  // on the top-level webpack config disables plugin schema validation.
  webpack.chainWebpack((config) => {
    config.set('validate', false);
  });

  return webpack.resolveConfig();
};
