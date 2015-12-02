var chai = require('chai');
var ioc = require('../');

describe('co-ioc', function() {
  it('should be instance of Map', function() {
    chai.assert.instanceOf(ioc(), Map);
  });

  it('should have #compile method', function() {
    chai.assert.typeOf(ioc().compile, 'function');
  });

  describe('#set', function() {
    it('should throw TypeError fn is not a generator', function() {
      chai.assert.throws(function() {
        ioc().set('not-a-gen');
      }, TypeError);
    });

    it('should set generator for provider', function() {
      var container = ioc();
      var gen = function *() {}

      container.set('foo', gen);

      chai.assert(container.has('foo'));
      chai.assert.strictEqual(container.get('foo'), gen);
    });
  });

  describe('#compile', function() {
    before(function() {
      var container = ioc();
      var service = {};
      var context = this;

      container.set('service', function *() {
        ++context.called;
        return service;
      });

      this.container = container;
      this.service = service;
      this.called = 0;
    });

    it('should compile provider as a service', function (done) {
      var service = this.service;

      this.container.compile(function(err, services) {
        chai.assert(services.has('service'));
        chai.assert.strictEqual(services.get('service'), service);
        done();
      });
    });

    it('should call provider factory for key', function (done) {
      var context = this;

      this.container.compile(function() {
        chai.assert.isAbove(context.called, 0);
        done();
      });
    });

    it('should return cached compile services', function(done) {
      var container = this.container;

      container.compile(function(err, services1) {
        container.compile(function(err, services2) {
          chai.assert.strictEqual(services1, services2);
          done();
        });
      });
    });

    it('should return Error if no provider exists', function(done) {
      this.container.set('error', function *(container) {
        yield container.get('nonexistant');
      });

      this.container.compile(function(err) {
        chai.assert.instanceOf(err, Error);
        done();
      });
    });

    it('should return Error on circular providers', function(done) {
      this.container.set('foo', function *(container) {
        yield container.get('foo');
      });

      this.container.compile(function(err) {
        chai.assert.instanceOf(err, Error);
        done();
      });
    });
  });
});
