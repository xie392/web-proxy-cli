#!/usr/bin/env node

// 入口文件，加载编译后的 CLI
import('../dist/cli.js').then(module => {
  module.main();
}).catch(error => {
  console.error('Failed to start proxy CLI:', error);
  process.exit(1);
});
