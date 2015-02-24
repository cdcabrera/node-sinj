#NodeJS-Sinj (Simple Injector)

A dependency injector based on AngularJS' 1.X way of handling modules.

Created because I needed a clean module loader that took care of handling required
modules while providing context without cluttering the global space. AngularJS' module
creation fit right in line with those requirements.

This is a bare bones implementation, just enough to cover loading modules, passing
basic scope/context and configuration.



##How it Works

The module method loads and caches "required" resources.
From there you can setup controllers and workers/factories. If
you've used AngularJS you should be able to recognize the module [layout pattern](https://docs.angularjs.org/api/ng/function/angular.module).

There is a noticeable difference in the use of an object instead of an array to
pull in available modules. Instead the object provides a mechanism for loading and caching
required modules while assigning them to required keys/ids similar to how AngularJS pulls in resources.
These mechanics in turn provide the available scope/context for the loaded modules.

Create your app... pull all your modules in.

```javascript

require('sinj');

sinj
    .module('namespace', {
        'namespace.config':     './app/config',
        'namespace.worker':     './app/worker.dothethings',
        'namespace.controller': './app/controller'
    });
```

Create a config worker/factory... reference existing Node modules and
return available properties.

```javascript

sinj
    .module('namespace.config')
    .worker('config', [
        'fs',
        'path',
        function (fs, path) {

            return {

                "someproperty": "some property"

            };
        }]);
```


Create a worker/factory... reference the available "config" context and
return available method(s). You could also include modules Node already contains.

```javascript

sinj
    .module('namespace.worker')
    .worker('someworker', [
        'config',
        function (config) {

            return {

                start: function () {

                    console.log('doing the things and '+config.someproperty);
                }
            };
        }]);
```

Create a controller... reference all available context, including the worker.
You could also include modules Node already contains.

```javascript

sinj
    .module('namespace.controller')
    .controller('somecontroller', [
        'config',
        'someworker',
        function (config, someworker) {

            someworker.start();

        }]);
```



##License

My aspect is released under the [MIT License](http://en.wikipedia.org/wiki/MIT_License).

My concept originated with [AngularJS](https://angularjs.org/), [MIT License](http://en.wikipedia.org/wiki/MIT_License).
And I used the NPM module [injectr](https://github.com/nathanmacinnes/injectr), [MIT License](http://opensource.org/licenses/MIT)
as a basis for applying context.