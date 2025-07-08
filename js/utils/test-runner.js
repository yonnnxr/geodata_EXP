// Framework Básico de Testes Automatizados
class TestRunner {
    constructor(options = {}) {
        this.options = {
            verbose: options.verbose !== false,
            autoRun: options.autoRun !== false,
            timeout: options.timeout || 5000,
            retries: options.retries || 0,
            failFast: options.failFast || false,
            onComplete: options.onComplete || null,
            onError: options.onError || null
        };

        this.tests = [];
        this.suites = new Map();
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            startTime: null,
            endTime: null,
            duration: 0
        };
        
        this.currentSuite = null;
        this.beforeEachHooks = [];
        this.afterEachHooks = [];
        this.beforeAllHooks = [];
        this.afterAllHooks = [];
        
        this.setupAssertions();
        
        if (this.options.autoRun) {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.runAllTests(), 100);
            });
        }
    }

    // === API Principal de Testes ===
    
    describe(name, fn) {
        const suite = {
            name,
            tests: [],
            beforeEach: [],
            afterEach: [],
            beforeAll: [],
            afterAll: [],
            parent: this.currentSuite
        };
        
        this.suites.set(name, suite);
        const previousSuite = this.currentSuite;
        this.currentSuite = suite;
        
        try {
            fn();
        } finally {
            this.currentSuite = previousSuite;
        }
        
        return suite;
    }

    it(name, fn, options = {}) {
        const test = {
            name,
            fn,
            suite: this.currentSuite?.name,
            timeout: options.timeout || this.options.timeout,
            skip: options.skip || false,
            only: options.only || false,
            retries: options.retries || this.options.retries,
            tags: options.tags || []
        };
        
        this.tests.push(test);
        
        if (this.currentSuite) {
            this.currentSuite.tests.push(test);
        }
        
        return test;
    }

    // Alias para diferentes tipos de teste
    test(name, fn, options) {
        return this.it(name, fn, options);
    }

    // Skip e Only
    skip(name, fn, options = {}) {
        return this.it(name, fn, { ...options, skip: true });
    }

    only(name, fn, options = {}) {
        return this.it(name, fn, { ...options, only: true });
    }

    // === Hooks ===
    
    beforeEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach.push(fn);
        } else {
            this.beforeEachHooks.push(fn);
        }
    }

    afterEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterEach.push(fn);
        } else {
            this.afterEachHooks.push(fn);
        }
    }

    beforeAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll.push(fn);
        } else {
            this.beforeAllHooks.push(fn);
        }
    }

    afterAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterAll.push(fn);
        } else {
            this.afterAllHooks.push(fn);
        }
    }

    // === Execução de Testes ===
    
    async runAllTests() {
        this.log('🚀 Iniciando execução de testes...');
        
        this.results.startTime = Date.now();
        this.resetResults();
        
        // Verificar se há testes 'only'
        const onlyTests = this.tests.filter(test => test.only);
        const testsToRun = onlyTests.length > 0 ? onlyTests : this.tests;
        
        try {
            // Executar hooks beforeAll globais
            for (const hook of this.beforeAllHooks) {
                await this.runHook(hook, 'beforeAll (global)');
            }
            
            // Executar por suites
            const suiteNames = [...new Set(testsToRun.map(t => t.suite).filter(Boolean))];
            
            for (const suiteName of suiteNames) {
                await this.runSuite(suiteName, testsToRun);
            }
            
            // Executar testes sem suite
            const testsWithoutSuite = testsToRun.filter(t => !t.suite);
            for (const test of testsWithoutSuite) {
                await this.runTest(test);
                
                if (this.options.failFast && this.results.failed > 0) {
                    break;
                }
            }
            
            // Executar hooks afterAll globais
            for (const hook of this.afterAllHooks) {
                await this.runHook(hook, 'afterAll (global)');
            }
            
        } catch (error) {
            this.log(`❌ Erro durante execução: ${error.message}`);
            if (this.options.onError) {
                this.options.onError(error);
            }
        }
        
        this.results.endTime = Date.now();
        this.results.duration = this.results.endTime - this.results.startTime;
        
        this.printResults();
        
        if (this.options.onComplete) {
            this.options.onComplete(this.results);
        }
        
        return this.results;
    }

    async runSuite(suiteName, testsToRun) {
        const suite = this.suites.get(suiteName);
        if (!suite) return;
        
        this.log(`📁 Suite: ${suiteName}`);
        
        try {
            // beforeAll da suite
            for (const hook of suite.beforeAll) {
                await this.runHook(hook, `beforeAll (${suiteName})`);
            }
            
            // Executar testes da suite
            const suiteTests = testsToRun.filter(t => t.suite === suiteName);
            for (const test of suiteTests) {
                await this.runTest(test, suite);
                
                if (this.options.failFast && this.results.failed > 0) {
                    break;
                }
            }
            
            // afterAll da suite
            for (const hook of suite.afterAll) {
                await this.runHook(hook, `afterAll (${suiteName})`);
            }
            
        } catch (error) {
            this.log(`❌ Erro na suite ${suiteName}: ${error.message}`);
        }
    }

    async runTest(test, suite = null) {
        if (test.skip) {
            this.results.skipped++;
            this.log(`⏭️  SKIP: ${test.name}`);
            return;
        }
        
        this.results.total++;
        const testName = suite ? `${suite.name} > ${test.name}` : test.name;
        
        let attempts = 0;
        const maxAttempts = test.retries + 1;
        
        while (attempts < maxAttempts) {
            try {
                // beforeEach hooks
                await this.runBeforeEachHooks(suite);
                
                // Executar o teste com timeout
                await this.runWithTimeout(test.fn, test.timeout);
                
                // afterEach hooks
                await this.runAfterEachHooks(suite);
                
                this.results.passed++;
                this.log(`✅ PASS: ${testName}`);
                return;
                
            } catch (error) {
                attempts++;
                
                if (attempts >= maxAttempts) {
                    this.results.failed++;
                    this.results.errors.push({
                        test: testName,
                        error: error.message,
                        stack: error.stack
                    });
                    this.log(`❌ FAIL: ${testName} - ${error.message}`);
                    
                    // afterEach hooks mesmo em caso de erro
                    try {
                        await this.runAfterEachHooks(suite);
                    } catch (hookError) {
                        this.log(`⚠️  Erro no afterEach: ${hookError.message}`);
                    }
                } else {
                    this.log(`🔄 RETRY: ${testName} (tentativa ${attempts + 1})`);
                }
            }
        }
    }

    async runBeforeEachHooks(suite) {
        // Hooks globais primeiro
        for (const hook of this.beforeEachHooks) {
            await this.runHook(hook, 'beforeEach (global)');
        }
        
        // Hooks da suite
        if (suite) {
            for (const hook of suite.beforeEach) {
                await this.runHook(hook, `beforeEach (${suite.name})`);
            }
        }
    }

    async runAfterEachHooks(suite) {
        // Hooks da suite primeiro
        if (suite) {
            for (const hook of suite.afterEach) {
                await this.runHook(hook, `afterEach (${suite.name})`);
            }
        }
        
        // Hooks globais depois
        for (const hook of this.afterEachHooks) {
            await this.runHook(hook, 'afterEach (global)');
        }
    }

    async runHook(hook, name) {
        try {
            await hook();
        } catch (error) {
            throw new Error(`Hook ${name} falhou: ${error.message}`);
        }
    }

    async runWithTimeout(fn, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Teste excedeu timeout de ${timeout}ms`));
            }, timeout);
            
            try {
                const result = fn();
                
                if (result && typeof result.then === 'function') {
                    result
                        .then(resolve)
                        .catch(reject)
                        .finally(() => clearTimeout(timer));
                } else {
                    clearTimeout(timer);
                    resolve(result);
                }
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    // === Sistema de Assertions ===
    
    setupAssertions() {
        this.expect = (actual) => ({
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${actual} to be ${expected}`);
                }
            },
            
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
                }
            },
            
            toBeNull: () => {
                if (actual !== null) {
                    throw new Error(`Expected ${actual} to be null`);
                }
            },
            
            toBeUndefined: () => {
                if (actual !== undefined) {
                    throw new Error(`Expected ${actual} to be undefined`);
                }
            },
            
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected ${actual} to be truthy`);
                }
            },
            
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected ${actual} to be falsy`);
                }
            },
            
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            },
            
            toMatch: (regex) => {
                if (!regex.test(actual)) {
                    throw new Error(`Expected ${actual} to match ${regex}`);
                }
            },
            
            toThrow: () => {
                let threw = false;
                try {
                    actual();
                } catch {
                    threw = true;
                }
                if (!threw) {
                    throw new Error('Expected function to throw');
                }
            },
            
            toHaveLength: (length) => {
                if (actual.length !== length) {
                    throw new Error(`Expected length ${actual.length} to be ${length}`);
                }
            },
            
            toHaveProperty: (prop) => {
                if (!(prop in actual)) {
                    throw new Error(`Expected object to have property ${prop}`);
                }
            }
        });
        
        // Mock functions
        this.jest = {
            fn: (implementation) => {
                const mock = implementation || (() => {});
                mock.calls = [];
                mock.results = [];
                
                const mockFn = (...args) => {
                    mock.calls.push(args);
                    try {
                        const result = mock(...args);
                        mock.results.push({ type: 'return', value: result });
                        return result;
                    } catch (error) {
                        mock.results.push({ type: 'throw', value: error });
                        throw error;
                    }
                };
                
                mockFn.calls = mock.calls;
                mockFn.results = mock.results;
                mockFn.mockReturnValue = (value) => {
                    mock.mockImplementation = () => value;
                    return mockFn;
                };
                
                return mockFn;
            }
        };
    }

    // === Utilitários ===
    
    resetResults() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            startTime: null,
            endTime: null,
            duration: 0
        };
    }

    printResults() {
        const { total, passed, failed, skipped, duration } = this.results;
        
        console.log('\n📊 Resultados dos Testes:');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ Passou: ${passed}`);
        console.log(`❌ Falhou: ${failed}`);
        console.log(`⏭️  Ignorado: ${skipped}`);
        console.log(`📈 Total: ${total}`);
        console.log(`⏱️  Duração: ${duration}ms`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        if (failed > 0) {
            console.log('\n❌ Falhas:');
            this.results.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.test}`);
                console.log(`   ${error.error}`);
            });
        }
        
        const success = failed === 0;
        console.log(`\n${success ? '🎉' : '💥'} Testes ${success ? 'passaram' : 'falharam'}!`);
    }

    log(message) {
        if (this.options.verbose) {
            console.log(message);
        }
    }

    // === Helpers para diferentes tipos de teste ===
    
    // Testes de DOM
    createDOMTest(html) {
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
        
        return {
            container,
            cleanup: () => {
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            }
        };
    }

    // Testes assíncronos
    async waitFor(condition, timeout = 1000) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            if (await condition()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        throw new Error('Condition not met within timeout');
    }

    // Mock de fetch
    mockFetch(responses) {
        const originalFetch = window.fetch;
        const responseQueue = [...responses];
        
        window.fetch = jest.fn(() => {
            const response = responseQueue.shift();
            if (!response) {
                return Promise.reject(new Error('No more mocked responses'));
            }
            
            return Promise.resolve({
                ok: response.status < 400,
                status: response.status || 200,
                json: () => Promise.resolve(response.data),
                text: () => Promise.resolve(JSON.stringify(response.data))
            });
        });
        
        return () => {
            window.fetch = originalFetch;
        };
    }

    // === API de Relatórios ===
    
    generateReport() {
        return {
            summary: this.results,
            details: {
                suites: Array.from(this.suites.keys()),
                tests: this.tests.map(t => ({
                    name: t.name,
                    suite: t.suite,
                    skip: t.skip,
                    tags: t.tags
                }))
            },
            timestamp: new Date().toISOString()
        };
    }

    exportReport() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Instância global para uso direto
const testRunner = new TestRunner();

// Exportar funções globais
window.describe = testRunner.describe.bind(testRunner);
window.it = testRunner.it.bind(testRunner);
window.test = testRunner.test.bind(testRunner);
window.skip = testRunner.skip.bind(testRunner);
window.only = testRunner.only.bind(testRunner);
window.beforeEach = testRunner.beforeEach.bind(testRunner);
window.afterEach = testRunner.afterEach.bind(testRunner);
window.beforeAll = testRunner.beforeAll.bind(testRunner);
window.afterAll = testRunner.afterAll.bind(testRunner);
window.expect = testRunner.expect;
window.jest = testRunner.jest;

// Funções utilitárias
window.runTests = () => testRunner.runAllTests();
window.exportTestReport = () => testRunner.exportReport();

// Para controle manual
window.testRunner = testRunner;

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestRunner;
} 