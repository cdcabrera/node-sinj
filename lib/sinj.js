
(function(global, undefined){

    'use strict';

    var _process        = global.process,
        _fs             = require('fs'),
        _path           = require('path'),
        _vm             = require('vm'),

        _sinjInternalData   = { cache:{}, executed:false },
        _sinjMethodData     = {},
        _sinjTypeData       = {},
        _sinjNamespaceData  = {};

    global.sinj = {};

    global.sinj.module = function(){

        var _settings = {
            namespace:  arguments[0],
            modules:    arguments[1],
            intData:    _sinjInternalData,
            methodData: _sinjMethodData,    // store namespace with actual available method
            typeData:   _sinjTypeData,      // store reference namespace with types and method names
            nameData:   _sinjNamespaceData, // store reference namespaces available to the namespace and whether they've loaded
            timeout:    180000,
            errors:     ['Unknown error.','Duplicate naming.', 'Missing parameter.', 'Module missing dependency.', 'Controller within controller.']
        };

        setupModuleDataStore();

        /**
         * Start, but wait on processing chained methods through "processTypeArgs()".
         */
        setTimeout(function(){

            parseModule();
        },0);

        /**
         * Initialize namespace with empty object for storage.
         */
        function setupModuleDataStore () {

            var namespace   = _settings.namespace,
                methodData  = _settings.methodData[namespace];

            if (methodData) {

                exception(1, namespace);
            }

            _settings.nameData[namespace] = {};
            _settings.methodData[namespace] = {};
            _settings.typeData[namespace] = {};
        }

        /**
         * Parse module parameters.
         */
        function parseModule () {

            var namespace           = _settings.namespace,
                namespaceModules    = _settings.modules,
                intData             = _settings.intData;

            switch (Object.prototype.toString.call(namespaceModules))
            {
                case '[object Array]':

                    // process as an array of provided modules, not verified
                    loadArrayModules(namespace, namespaceModules);
                    break;
                case '[object Object]':

                    // process as an object of provided modules, verified
                    loadObjectModules(namespace, namespaceModules);
                    break;
            }

            /**
             * Continue, but wait on processing all modules.
             */
            setTimeout(function(){

                if (intData.executed) {

                    return;
                }

                _settings.intData.executed = true;

                //checkNameDataReferences();
                checkNamespaceExists();
                checkMethodDuplicates();
                executeMethods();
            },0);
        }

        /**
         * Process array of namespace-modules and flag as not loaded.
         * @param namespace {string}
         * @param namespaceModules {Array}
         */
        function loadArrayModules (namespace, namespaceModules) {

            var nameData = _settings.nameData[namespace];

            for (var i=0; i<namespaceModules.length; i++) {

                _settings.nameData[namespace][namespaceModules[i]] = false;
            }
        }

        /**
         * Process object of namespace-modules, load files, and flag as loaded.
         * @param namespace {string}
         * @param namespaceModules {Object}
         */
        function loadObjectModules (namespace, namespaceModules) {

            var path            = _path,
                process         = _process,
                fs              = _fs,
                files           = [],
                count           = 0;

            for (var modulesKey in namespaceModules) {

                if ( !namespaceModules.hasOwnProperty(modulesKey) ) {

                    continue;
                }

                var filePath    = path.join( process.cwd(), namespaceModules[modulesKey]),
                    fileExt     = path.extname(filePath);

                if ( fileExt !== 'js' ) {

                    filePath += '.js';
                }

                _settings.intData.cache[filePath] = _settings.intData.cache[filePath] || fs.readFileSync(filePath, 'utf8');

                _settings.nameData[namespace][modulesKey] = true;

                files.push({
                    path: filePath,
                    content: _settings.intData.cache[filePath]
                });

                count += 1;
            }

            executeFiles(files);
        }

        /**
         * Execute script files, provide them with the parents script context.
         * @param files {Array}
         */
        function executeFiles (files) {

            var vm      = _vm,
                timeout = _settings.timeout;

            for (var i=0; i<files.length; i++) {

                var module = files[i],
                    options= {filename:module.path, displayErrors:true, timeout:timeout},
                    script = new vm.Script(module.content, options);

                script.runInThisContext(options);
            }
        }

        /**
         * Check module namespace dependencies to see if they're loaded. Aimed at allowing the use of arrays as the 2nd parameter for modules. You can use them as long as the resource exists already.
         */
        function checkNamespaceExists () {

            var nameData = _settings.nameData;

            for (var key in nameData) {

                if ( !nameData.hasOwnProperty(key) ) {

                    continue;
                }

                for (var subkey in nameData[key]) {

                    if (nameData[key].hasOwnProperty(subkey) && nameData[key][subkey] === false) {

                        if (subkey in nameData) {

                            _settings.nameData[key][subkey] = true;
                        } else {

                            // module missing a dependency
                            exception( 3, key, subkey);
                        }
                    }
                }
            }
        }


        function checkMethodDuplicates () {


        }

        /**
         * Start executing methods, or actually do the things...
         */
        function executeMethods () {


            console.log(_settings.methodData);
            console.log(_settings.nameData);
            console.log(_settings.typeData);
        }

        /**
         * Process arguments from the provided methods.
         * @param type {string}
         * @param namespace {string}
         * @param name {string}
         * @param dependencyMethod {Array}
         */
        function processTypeArgs (type, namespace, name, dependencyMethod) {

            var methodData = _settings.methodData[namespace],
                methodObj;

            // missing parameters
            if (!name || !dependencyMethod) {

                exception(2, namespace);
            }

            // duplicate method within namespace
            if (name in methodData) {

                exception(1, namespace, name);
            }

            methodObj = {
                namespace:  namespace,
                name:       name,
                type:       type,
                dependency: dependencyMethod.slice(0, dependencyMethod.length - 1),
                method:     dependencyMethod.slice(dependencyMethod.length - 1)[0]
            };

            if (!_settings.typeData[namespace][type]) {

                _settings.typeData[namespace][type] = {};
            }

            // register reference of available types of methods
            _settings.typeData[namespace][type][name] = true;

            // register actual methods
            _settings.methodData[namespace][name] = methodObj;
        }

        /**
         * Throw a basic module exception, defaults to "unknown error".
         * @param index {int}
         * @param namespace {string}
         * @param name {string}
         */
        function exception (index, namespace, name) {

            var message = (index > 0)? _settings.errors[index] : _settings.errors[0];

            message += ' Module: '+namespace;

            if (name) {

                message += ' -> '+name;
            }

            throw new Error(message);
        }

        /**
         * Check to see if a string is within NodeJS loaded modules. There are additional facets to the array values doing a simple indexOf fails.
         * @param value {string}
         * @returns {boolean}
         */
        function checkNodeModules (value) {

            var nodeModules = _process.moduleLoadList;

            return (','+nodeModules.join(',')+',').toLowerCase().indexOf((' '+value+',').toLowerCase()) > -1;
        }

        /**
         * Basic check for values in an array.
         * @param value
         * @param arr
         * @returns {boolean}
         */
        function inArray(value, arr) {

            return (','+arr.join(',')+',').toLowerCase().indexOf((','+value+',').toLowerCase()) > -1;
        }

        /**
         * Expose methods.
         */
        return {

            controller: function (name, dependencyMethod) {

                processTypeArgs('controller', _settings.namespace, name, dependencyMethod);
                return this;
            },

            worker : function (name, dependencyMethod) {

                processTypeArgs('worker', _settings.namespace, name, dependencyMethod);
                return this;
            }

        };

    };

})(global);