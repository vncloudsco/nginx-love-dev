/**
 * Standalone Build Script for Cloudflare Manager Plugin
 * Builds plugin without requiring full backend compilation
 */

const esbuild = require('esbuild');
const path = require('path');

const buildPlugin = async () => {
  try {
    console.log('🔨 Building Cloudflare Manager Plugin...');
    
    // Build main plugin file
    await esbuild.build({
      entryPoints: ['index.ts'],
      outfile: 'index.js',
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      sourcemap: true,
    });
    
    // Build cloudflare client
    await esbuild.build({
      entryPoints: ['services/cloudflare-client.ts'],
      outfile: 'services/cloudflare-client.js',
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      sourcemap: true,
    });
    
    console.log('✅ Plugin built successfully!');
    console.log('📦 Output files:');
    console.log('   - index.js');
    console.log('   - services/cloudflare-client.js');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
};

buildPlugin();
