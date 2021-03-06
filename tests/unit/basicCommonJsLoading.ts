intern.getInterface('object').registerSuite('basic CommonJS loading', () => {
	const { assert } = intern.getPlugin('chai');

	const COMMON_JS_APP_MESSAGE = 'Message from CommonJS app.';
	const DEFAULT_TIMEOUT = 1000;

	let globalErrorHandler: any;
	let originalDefine: any;
	let originalRequire: any;

	function setErrorHandler(dfd: any) {
		(<any>process)._events.uncaughtException = function(error: Error) {
			dfd.reject(error);
		};
	}

	function reloadLoader() {
		let loaderPath = require.resolve('../../src/loader.js');

		global.define = <any>null;
		global.require = <any>null;

		if (require.cache) {
			delete require.cache[loaderPath];
		}

		require(loaderPath);
	}

	return {
		before() {
			originalDefine = global.define;
			originalRequire = global.require;
		},

		after() {
			global.define = originalDefine;
			global.require = originalRequire;
		},

		beforeEach() {
			// Do this before each test to ensure a clean loader environment with empty cache
			reloadLoader();

			global.require.config({
				packages: [
					{
						name: 'commonJs',
						location: './tests/common/commonJs'
					}
				]
			});

			// Need to handle global errors to catch errors thrown by 'require' or 'define'
			// otherwise the whole test suite dies
			// Note: process.on('uncaughtException') does not work
			globalErrorHandler = (<any>process)._events.uncaughtException;
			delete (<any>process)._events.uncaughtException;
		},

		afterEach() {
			(<any>process)._events.uncaughtException = globalErrorHandler;
		},

		tests: {
			'simple test'(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require(
					['commonJs/app'],
					dfd.callback(function(app: any) {
						assert.strictEqual(app.getMessage(), COMMON_JS_APP_MESSAGE);
					})
				);
			},

			'CommonJS module with ID'(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require(
					['require', 'commonJs/testModule1'],
					dfd.callback(function(require: any) {
						let testModule1 = require('test/module1');

						assert.strictEqual(testModule1, 'testModule1', 'Test module with explicit mid should load');
					})
				);
			},

			'CommonJS module with ID and dependency - ID'(this: any) {
				const expected = {
					testModule1Value: 'testModule1',
					testModule2Value: 'testModule2'
				};

				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require(
					['require', 'commonJs/testModule1', 'commonJs/testModule2'],
					dfd.callback(function(require: any) {
						let testModule2 = require('test/module2');

						assert.deepEqual(testModule2, expected, 'Test modules with explicit mids should load');
					})
				);
			},

			'CommonJS module with ID and dependency - module'(this: any) {
				const expected = {
					appModuleValue: COMMON_JS_APP_MESSAGE,
					testModule3Value: 'testModule3'
				};

				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require(
					['require', 'commonJs/testModule3'],
					dfd.callback(function(require: any) {
						let testModule3 = require('test/module3');

						assert.deepEqual(testModule3, expected, 'Test module and dependency should load');
					})
				);
			},

			'CommonJS module without ID and dependency - id'(this: any) {
				const expected = {
					testModule1Value: 'testModule1',
					testModule2Value: 'testModule2'
				};

				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				// 'commonJs/testModule1.js' specifies its mid explicitly ('test/module1'), so we have to specify it by filepath
				// to get it load initially. 'commonJs/app1' specifies 'test/module1' as a dependency, so we need to ensure
				// 'commonJs/testModule1.js' has been loaded before we attempt to load 'commonJs/app1'
				global.require(['require', 'commonJs/testModule1'], function(require: any) {
					require(['commonJs/app1'], dfd.callback(function(app1: any) {
						assert.strictEqual(
							app1.getMessage(),
							expected.testModule1Value,
							'Test module and dependency should load'
						);
					}));
				});
			},

			'CommonJS module with circular dependency'(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require(
					['commonJs/circular1'],
					dfd.callback(function(circular1: any) {
						assert.strictEqual(
							circular1.getMessage(),
							'circular1',
							'Circular dependency should be resolved'
						);
						assert.strictEqual(
							circular1.circular2Message(),
							'circular2',
							'Circular dependency should be resolved'
						);
					})
				);
			},

			'CommonJS module with circular dependency 2'(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require(
					['commonJs/circular2'],
					dfd.callback(function(circular2: any) {
						assert.strictEqual(
							circular2.getMessage(),
							'circular2',
							'Circular dependency should be resolved'
						);
						assert.strictEqual(
							circular2.circular1Message(),
							'circular1',
							'Circular dependency should be resolved'
						);
					})
				);
			},

			'CommonJS module with circular dependency 3'(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require(
					['commonJs/circular1', 'commonJs/circular2'],
					dfd.callback(function(circular1: any, circular2: any) {
						assert.strictEqual(
							circular1.getMessage(),
							'circular1',
							'Circular dependency should be resolved'
						);
						assert.strictEqual(
							circular1.circular2Message(),
							'circular2',
							'Circular dependency should be resolved'
						);
						assert.strictEqual(
							circular2.getMessage(),
							'circular2',
							'Circular dependency should be resolved'
						);
						assert.strictEqual(
							circular2.circular1Message(),
							'circular1',
							'Circular dependency should be resolved'
						);
					})
				);
			},

			'CommonJS module with deep dependencies'(this: any) {
				const expected = {
					objectExport: 'objectExport'
				};

				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require(
					['commonJs/deep1'],
					dfd.callback(function(deep1: any) {
						let obj = deep1();

						assert.isObject(obj, 'deep1() should create an object');
						assert.deepEqual(obj.deep3(), expected, 'deep3() should create an object');
					})
				);
			}
		}
	};
});
