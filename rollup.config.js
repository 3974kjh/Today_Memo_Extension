import { spawn } from 'child_process';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';

const production = !process.env.ROLLUP_WATCH;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

const commonPlugins = [
	svelte({
		compilerOptions: {
			// enable run-time checks when not in production
			dev: !production
		}
	}),
	// ...기존 플러그인...
	copy({
		targets: [
			{ src: 'public/*', dest: 'dist' },
			{ src: 'static/manifest.json', dest: 'dist' }
		]
	}),

	// If you have external dependencies installed from
	// npm, you'll most likely need these plugins. In
	// some cases you'll need additional configuration -
	// consult the documentation for details:
	// https://github.com/rollup/plugins/tree/master/packages/commonjs
	resolve({
		browser: true,
		dedupe: ['svelte'],
		exportConditions: ['svelte']
	}),
	commonjs(),

	postcss({
		extract: 'bundle.css',
		minimize: true
	}),

	// In dev mode, call `npm run start` once
	// the bundle has been generated
	!production && serve(),

	// Watch the `public` directory and refresh the
	// browser on changes when not in production
	!production && livereload('public'),

	// If we're building for production (npm run build
	// instead of npm run dev), minify
	production && terser()
]

export default [
  // Popup(메인 Svelte) 번들
  {
    input: 'src/main.js',
    output: {
      file: 'dist/build/bundle.js',
      format: 'iife',
      name: 'Bundle'
    },
    plugins: [
      ...commonPlugins
    ],
    watch: {
      clearScreen: false
    }
  },
  // Background 번들
  {
    input: 'src/background.js',
    output: {
      file: 'dist/build/background.js',
      format: 'iife',
      name: 'Background'
    },
    plugins: [
      ...commonPlugins
    ],
    watch: {
      clearScreen: false
    }
  },
  // Content script 번들
  {
    input: 'src/content.js',
    output: {
      file: 'dist/build/content.js',
      format: 'iife',
      name: 'Content'
    },
    plugins: [
      ...commonPlugins
    ],
    watch: {
      clearScreen: false
    }
  }
];