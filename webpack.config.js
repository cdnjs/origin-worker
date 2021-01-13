module.exports = {
  entry: "./src/index.js",
  module: {
    rules: [
      {
        test: /\.css|html|svg$/i,
        use: [
          {
            loader: 'raw-loader',
            options: {
              esModule: false,
            },
          },
        ],
      },
    ],
  },
}

