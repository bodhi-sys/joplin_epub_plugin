const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const chalk = require('chalk');
const CopyPlugin = require('copy-webpack-plugin');
const tar = require('tar');
const { glob } = require('glob');
const execSync = require('child_process').execSync;
const webpack = require('webpack');

const rootDir = path.resolve(__dirname);
const distDir = path.resolve(rootDir, 'dist');
const srcDir = path.resolve(rootDir, 'src');
const publishDir = path.resolve(rootDir, 'publish');

const manifestPath = `${srcDir}/manifest.json`;
const packageJsonPath = `${rootDir}/package.json`;

const { builtinModules } = require('node:module');
const moduleFallback = {};
for (const moduleName of builtinModules) {
    moduleFallback[moduleName] = false;
}

// Add polyfills for webview (browser environment)
const browserFallback = {
    ...moduleFallback,
    fs: false,
    path: require.resolve('path-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer/'),
    util: require.resolve('util/'),
    events: require.resolve('events/'),
    zlib: require.resolve('browserify-zlib'),
};

function readManifest(manifestPath) {
    const content = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(content);
}

const manifest = readManifest(manifestPath);
const pluginArchiveFilePath = path.resolve(publishDir, `${manifest.id}.jpl`);
const pluginInfoFilePath = path.resolve(publishDir, `${manifest.id}.json`);

function fileSha256(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function onBuildCompleted() {
    try {
        const distFiles = glob.sync(`${distDir}/**/*`, { nodir: true, windowsPathsNoEscape: true })
            .map(f => path.relative(distDir, f));

        if (!distFiles.length) throw new Error('Plugin archive was not created because the "dist" directory is empty');
        fs.removeSync(pluginArchiveFilePath);

        tar.create(
            {
                strict: true,
                portable: true,
                file: pluginArchiveFilePath,
                cwd: distDir,
                sync: true,
            },
            distFiles,
        );

        const contentText = fs.readFileSync(manifestPath, 'utf8');
        const content = JSON.parse(contentText);
        content._publish_hash = `sha256:${fileSha256(pluginArchiveFilePath)}`;
        fs.writeFileSync(pluginInfoFilePath, JSON.stringify(content, null, '\t'), 'utf8');

        console.info(chalk.cyan(`Plugin archive has been created in ${pluginArchiveFilePath}`));
    } catch (error) {
        console.error(chalk.red(error.message));
    }
}

const baseConfig = {
    mode: 'production',
    stats: 'errors-only',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
};

const pluginConfig = { ...baseConfig, entry: './src/index.ts',
    target: 'web',
    resolve: {
        alias: {
            api: path.resolve(__dirname, 'api'),
        },
        fallback: {
            ...moduleFallback,
            fs: false,
            buffer: false,
            path: false,
            stream: false,
            util: false,
            events: false,
            zlib: false,
            process: false,
        },
        extensions: ['.js', '.tsx', '.ts', '.json'],
    },
    output: {
        filename: 'index.js',
        path: distDir,
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: '**/*',
                    context: path.resolve(__dirname, 'src'),
                    to: path.resolve(__dirname, 'dist'),
                    globOptions: {
                        ignore: ['**/*.ts', '**/*.tsx'],
                    },
                },
            ],
        }),
    ] };

const desktopConfig = { ...baseConfig, entry: './src/desktopEntryPoint.ts',
    target: 'node',
    resolve: {
        alias: {
            api: path.resolve(__dirname, 'api'),
        },
        fallback: moduleFallback,
        extensions: ['.js', '.tsx', '.ts', '.json'],
    },
    output: {
        filename: 'desktopEntryPoint.js',
        path: distDir,
        libraryTarget: 'commonjs',
    },
};

const webviewConfig = { ...baseConfig, entry: './src/webview.ts',
    target: 'web',
    resolve: {
        fallback: browserFallback,
        extensions: ['.js', '.tsx', '.ts', '.json'],
    },
    output: {
        filename: 'webview.js',
        path: distDir,
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser',
        }),
    ],
};

const createArchiveConfig = {
    stats: 'errors-only',
    entry: './dist/index.js',
    resolve: {
        fallback: moduleFallback,
    },
    output: {
        filename: 'index.js',
        path: publishDir,
    },
    plugins: [{
        apply(compiler) {
            compiler.hooks.done.tap('archiveOnBuildListener', onBuildCompleted);
        },
    }],
};

module.exports = (env) => {
    const configName = env['joplin-plugin-config'];
    if (configName === 'buildMain') {
        fs.removeSync(distDir);
        fs.removeSync(publishDir);
        fs.mkdirpSync(publishDir);
        return [pluginConfig, desktopConfig, webviewConfig];
    }
    if (configName === 'buildExtraScripts') {
        return [];
    }
    if (configName === 'createArchive') {
        return [createArchiveConfig];
    }
    throw new Error('A config file must be specified via the --joplin-plugin-config flag');
};
