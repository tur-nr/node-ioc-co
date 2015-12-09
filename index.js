var co = require('co');
var isval = require('isval');

module.exports = ioc;
function ioc() {
  var services = new Map();
  var providers = new Map();
  var stack = new Set();
  var container;

  // overwrite the native set method to only allow generators
  // and added clean up code
  providers.set = function (id, fn) {
    // must be a generator function
    if (!isval(fn, 'generator*')) {
      throw new TypeError('fn is not a generator function');
    }

    // set the provider
    Map.prototype.set.call(providers, id, fn);

    services.delete(id); // remove cached service
    container = null;    // wipe previous compiled container
  };

  // decorate with compile method for build container
  providers.compile = function(cb) {
    // already built a container
    if (container) {
      cb(null, container);
      return;
    }

    // build...
    co(function *() {
      for (var id of providers.keys()) {
        services.set(id, yield get(id));
      }
    }).then(function() {
      cb(null, container = new Map(services.entries()));
    }).catch(cb);
  };

  // will get the service provided with an id
  function get(id) {
    // service already built
    if (services.has(id)) {
      return Promise.resolve(services.get(id));
    }

    // id is already in get stack, can not complete
    if (stack.has(id)) {
      return Promise.reject(new Error('circular provider'));
    }

    stack.add(id); // add to get stack

    return new Promise(function(resolve, reject) {
      var fn = providers.get(id);

      // no service with id found
      if (!fn) {
        reject(new Error(id + ' does not exist'));
      }

      // build service
      co.wrap(fn)({
        get: get,
        has: providers.has.bind(providers)
      }).then(function(service) {
        stack.delete(id); // remove from get stack
        resolve(service);
      }, reject);
    });
  }

  return providers;
}
