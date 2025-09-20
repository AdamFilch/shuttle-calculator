module.exports = function (api) {
    api.cache(true);

    return {
        presets: [
            // 'module:@react-native/babel-preset',
            ["babel-preset-expo", {
                jsxImportSource: "nativewind"
            }],
            "nativewind/babel"
        ],

        plugins: [
            ["module-resolver", {
                root: ["./"],

                alias: {
                    "@": "./",
                    "tailwind.config": "./tailwind.config.js"
                }
            }],
            // 'react-native-worklets-core/plugin',
        ]
    };
};