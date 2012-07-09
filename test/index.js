
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , assert = require('assert')
  , fts = require('../')

mongoose.connect('localhost', 'mongoose_keywordize');

var schema = new Schema({
    name: { first: String, last: String }
  , tags: [String]
});

var opts = {};
opts.keyType = 'plain';
opts.fields = ['name.first', 'name.last'];
opts.fn = function () {
  if (this.isModified('tags')) {
    return this.tags[1];
  }
}

schema.plugin(fts, opts);

var Person = mongoose.model('Person', schema);

describe('plugin', function () {
  before(function (next) {
    mongoose.connection.on('open', next);
  });

  it('should have a version', function () {
    assert.ok(fts.hasOwnProperty('version'));
  });

  it('should create a keywords property of type array', function () {
    assert.equal(Person.schema.path('_keywords').casterConstructor.name,'SchemaString');
    var p = new Person;
    assert.equal(true, Array.isArray(p._keywords));
  });

  it('should add a updateIndex method to the schema', function () {
    assert.equal('function', typeof Person.prototype.updateIndex);
  });

  describe('keywordize', function () {
    it('should populate the keywords', function () {
      var p = new Person({ name: { last: 'heckmann' }});
      assert.equal(0, p._keywords.length);
      p.updateIndex();
      assert.equal(1, p._keywords.length);
      p.name.first = 'aaron';
      p.updateIndex();
      assert.equal(2, p._keywords.length);
      p.tags = "one two three".split(" ");
      p.updateIndex();
      assert.equal(3, p._keywords.length);
      p.updateIndex();
      assert.equal(3, p._keywords.length);
    });

    it('should return the keywords', function () {
      var p = new Person({ name: { last: 'agent', first: 'smith' }});
      assert.ok(p.updateIndex() instanceof Array);
      assert.equal(2, p.updateIndex().length);
    });

    it('should not allow duplicate keywords', function () {
      var p = new Person({ name: { last: 'smith', first: 'smith' }});
      assert.equal(1, p.updateIndex().length);
    });

    it('should trim the keywords', function () {
      var p = new Person({ name: { last: ' smith  ' }});
      assert.equal(p.updateIndex()[0], 'smith');
    });

    it('should lowercase the keywords', function () {
      var p = new Person({ name: { last: 'SmiTh' }});
      assert.equal(p.updateIndex()[0], 'smith');
    });

    it('should not lowercase keywords', function () {
      var s = new Schema({
          name: String
      });
      var opts = { fields: 'name', upper: true, keyType: 'plain' };
      s.plugin(fts, opts);
      var A = mongoose.model('A', s);
      var a = new A;
      a.name = 'Stravinsky'
      assert.equal(a.updateIndex()[0], 'Stravinsky');
    });
  });

  describe('hooks', function () {
    it('should add the keywords when new', function (next) {
      var p = new Person({ name: { last: 'heckmann' }});
      assert.equal(p._keywords.length,0);
      p.save(function (err) {
        if (err) return next(err);
        assert.equal(p._keywords.length,1);
        assert.equal(p._keywords[0],'heckmann');
        next();
      });
    });

    it('should update the keywords if any field changed', function (next) {
      var p = new Person({ name: { last: 'heckmann' }});
      assert.equal(p._keywords.length,0);
      p.save(function (err) {
        if (err) return next(err);
        assert.equal(p._keywords.length,1);
        assert.equal(p._keywords[0],'heckmann');
        p.name.last = 'fuerstenau';
        p.save(function (err) {
          if (err) return next(err);
          assert.equal(p._keywords.length,1);
          assert.equal(p._keywords[0],'fuerstenau');
          next();
        });
      });
    });
  });
  
  describe('options', function(){

  });

  after(function () {
    mongoose.disconnect();
  });

});


