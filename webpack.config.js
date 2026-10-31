const webpack = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const VERSIONS = ['v1', 'v2'];

module.exports = (env, argv) => VERSIONS.map((version, i) => ({
        name: version,
        stats: 'minimal', // Keep console output easy to read.
        entry: `./${version}/src/index.ts`, // Your program entry point

        // Your build destination
        output: {
            path: path.resolve(__dirname, 'dist', version),
            publicPath: 'auto', // relativo ao script: funciona na raiz (nginx) e em subcaminho (GitHub Pages)
            filename: 'bundle.js'
        },

        // Config for your testing server
        // Only the first config carries the devServer; it serves every version
        devServer: i > 0 ? undefined : {
            compress: true,
            allowedHosts: "all", // If you are using WebpackDevServer as your production server, please fix this line!
            static: false,
            client: {
                logging: "warn",
                overlay: {
                    errors: true,
                    warnings: false,
                },
                progress: true,
            },
            port: 1235, host: '0.0.0.0',
            // "/" opens the latest version
            setupMiddlewares: (middlewares) => {
                middlewares.unshift({ path: '/', middleware: (req, res, next) => {
                    if (req.url !== '/') return next();
                    res.writeHead(302, { Location: `/${VERSIONS[VERSIONS.length - 1]}/` });
                    res.end();
                } });
                return middlewares;
            },
        },

        // Web games are bigger than pages, disable the warnings that our game is too big.
        performance: { hints: false },

        // Enable sourcemaps while debugging
        devtool: argv.mode === 'development' ? 'eval-source-map' : undefined,

        // Minify the code when making a final build
        optimization: {
            minimize: argv.mode === 'production',
            minimizer: [new TerserPlugin({
                terserOptions: {
                    ecma: 6,
                    compress: { drop_console: true },
                    output: { comments: false, beautify: false },
                },
            })],
        },


        // Explain webpack how to do Typescript
        module: {
            rules: [
                {
                    test: /\.ts(x)?$/,
                    loader: 'ts-loader',
                    exclude: /node_modules/
                }
            ]
        },
        resolve: {
            extensions: [
                '.tsx',
                '.ts',
                '.js'
            ]
        },

        plugins: [
            // Copy our static assets to the final build
            new CopyPlugin({
                patterns: [{ from: `${version}/static/` }],
            }),

            // Make an index.html from the template
            new HtmlWebpackPlugin({
                template: `${version}/src/index.ejs`,
                hash: true,
                minify: false
            })
        ]
}));
