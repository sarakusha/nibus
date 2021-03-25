module.exports = {
  inputFiles: './src',
  mode: 'modules',
  out: 'doc',
  // entryPoint: 'src/index',
  // excludeNotExported: true,
  excludePrivate: true,
  // excludeInternal: true,
  excludeProtected: true,
  exclude: '**/*+(.spec|.e2e).ts',
};
