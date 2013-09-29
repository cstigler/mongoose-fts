
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
opts.fields = ['name.first', 'name.last', 'tags'];
opts.fn = function () {
  if (this.isModified('tags')) {
    return 'four';
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

  it('should create an _keywords property of type array', function () {
    assert.equal(Person.schema.path('_keywords').casterConstructor.name,'SchemaString');
    var p = new Person;
    assert.equal(true, Array.isArray(p._keywords));
  });

  it('should add a updateIndex method to the schema', function () {
    assert.equal('function', typeof Person.prototype.updateIndex);
  });

  describe('', function () {
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
      assert.equal(6, p._keywords.length);
      p.updateIndex();
      assert.equal(6, p._keywords.length);
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
  
  describe('keytypes', function() {
    it('work with stemming', function(next) {
      var s = new Schema({
          name: String
      });
      var opts = { fields: 'name', keyType: 'stem' };
      s.plugin(fts, opts);
      var StemTest = mongoose.model('StemTest', s);
      var a = new StemTest();
      a.name = 'absolver'
      assert.equal(a.updateIndex().length, 1);
      assert.equal(a.updateIndex()[0], 'absolv');
      next();
    });

    it('work with metaphone keys', function(next) {
      var s = new Schema({
          name: String
      });
      var opts = { fields: 'name', keyType: 'metaphone' };
      s.plugin(fts, opts);
      var MetaTest = mongoose.model('MetaTest', s);
      var a = new MetaTest();
      a.name = 'Smith'
      assert.equal(a.updateIndex().length, 1);
      assert.equal(a.updateIndex()[0], 'SM0');
      next();
    });
  });

  describe('options', function(){
    it('uses alternate keyword path', function(next) {
      var s = new Schema({
          name: String
      });
      var opts = { fields: 'name', keywordsPath: 'theBestest' };
      s.plugin(fts, opts);
      var PathTest = mongoose.model('PathTest', s);
      var a = new PathTest();
      a.name = 'Smith';
      a.updateIndex();
      assert.equal(a.theBestest.length, 1);
      assert.equal(a.theBestest[0], 'SM0');
      next();
    });
  });

  after(function () {
    mongoose.disconnect();
  });

});


