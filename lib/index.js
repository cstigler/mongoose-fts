/*!
 * mongoose-fts
 * Copyright(c) 2012 Charlie Stigler <charlie@charliestigler.com>
 * MIT Licensed
 */

/*!
 * (partly based off code from project...)
 * mongoose-keywordize
 * Copyright(c) 2012 Aaron Heckmann
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var mongoose = require('mongoose'),
    stemmer = require('./stemmer');

module.exports = exports = function fts (schema, options) {
  if (!Array.isArray(options.fields)) options.fields = [options.fields];

  var fields = options.fields.slice()
    , fn = 'function' == typeof options.fn && options.fn
    , upper = !! options.upper // if true, keywords will not be lowercased (only applies to keyword type)
    , keyType = options.keyType !== undefined ? options.keyType : 'metaphone'
    , keywordsPath = options.keywordsPath !== undefined ? options.keywordsPath : '_keywords';

  var addObj = {};
  addObj[keywordsPath] = [String];
  schema.add(addObj);

  schema.path(keywordsPath).index(true);

 /**
   * search.
   *
   * Searchs this model for the given query (which is split into keywords), using the given search type.
   * @api public
   */

  schema.statics.search = function(query, searchType, callback) {
    if(typeof searchType === 'function') { // allow searchType to be optional and have a default value
      callback = searchType;
      searchType = 'and';
    }

    if(searchType !== 'or') searchType = 'and';

    callback = (typeof callback === 'function') ? callback : function() {}; // make sure we don't have a null callback

    var qWords;

    switch(keyType) {
      case 'metaphone':
        qWords = stemmer.metaphoneString(query);
        break;

      case 'stem':
        qWords = stemmer.stemString(query);
        break;

      case 'plain':
        qWords = stemmer.keywordString(query);
        break;
    }

    // TODO: return matching words also so we can highlight them in the search results

    switch(searchType) {
      case 'and':
        var searchObj = {};
        searchObj[keywordsPath] = { $all: qWords };
        return mongoose.Model.find.call(this, searchObj, callback);
        break;

      case 'or':
        var searchObj = {};
        searchObj[keywordsPath] = { $in: qWords };
        return mongoose.Model.find.call(this, searchObj, callback);
        break;

      default:
        throw new Error('Error: Invalid search type');
    }
  };

 /**
   * indexAll.
   *
   * Convenience method to index all of the documents of a given Model at once.
   * @api public
   */

  schema.statics.indexAll = function(callback) {
    callback = (typeof callback === 'function') ? callback : function() {}; // make sure we don't have a null callback

    var updatedCount = 0;
    var errCount = 0;
    var unsaved = 0;

    mongoose.Model.find.call(this, {}, function(err, docs) {
      if(err) return callback(err, docs);

      unsaved = docs.length;

      for(var i = 0; i < docs.length; i++) {
        var doc = docs[i];

        doc.updateIndex();

        doc.save(function(err) {
          if(err) {
            console.warn('Warning: indexing error: ' + err);
            errCount++;
          }
          else updatedCount++;

          if(--unsaved === 0) return callback(null, updatedCount, errCount);
        });
      }
    });
  };

 /**
   * updateIndex.
   *
   * Updates this document's index with its new keywords.
   * @return {MongooseArray}
   * @api public
   */

  schema.methods.updateIndex = function() {
    var newKeywords;

    switch(keyType) {
      case 'metaphone':
        newKeywords = this.metaKeywords();
        break;

      case 'stem':
        newKeywords = this.stemKeywords();
        break;

      case 'plain':
        newKeywords = this.plainKeywords();
        break;
    }

    // setting keywords atomically at end rather than appending directly
    // as we go seems to avoid weird Mongo bugs
    this.set(keywordsPath, newKeywords);

    return newKeywords;
  };

  /**
   * metaKeywords.
   *
   * Breaks apart values of selected fields into keywords, then stems and processes them with metaphone.
   * @return {MongooseArray}
   * @api public
   */

  schema.methods.metaKeywords = function () {
    var self = this;

    var values = fields.map(function (field) {
      return self.get(field);
    });

    if (fn) {
      var res = fn.call(self);
      if (undefined !== res) {
        if (!Array.isArray(res)) res = [res];
        values = values.concat(res);
      }
    }

    var newKeywords = new mongoose.Types.Array([], keywordsPath, this);
    var i = values.length;

    while (i--) {
      var words = stemmer.keywordString(values[i] || '')

      words.forEach(function (word) {
        if (word) {
          if (upper)
            newKeywords.addToSet(word);
          else
            newKeywords.addToSet(word.toLowerCase());
        }
      });
    }

    return newKeywords;
  };

 /**
   * stemKeywords.
   *
   * Breaks apart values of selected fields into keywords, then stems them.
   * @return {MongooseArray}
   * @api public
   */

  schema.methods.stemKeywords = function () {
    var self = this;

    var values = fields.map(function (field) {
      return self.get(field);
    });

    if (fn) {
      var res = fn.call(self);
      if (undefined !== res) {
        if (!Array.isArray(res)) res = [res];
        values = values.concat(res);
      }
    }

    var newKeywords = new mongoose.Types.Array([], keywordsPath, this);
    var i = values.length;

    while (i--) {
      var stemmed = stemmer.stemString(values[i] || '');

      stemmed.forEach(function (stem) {
        if (stem) {
          if (upper)
            newKeywords.addToSet(stem);
          else
            newKeywords.addToSet(stem.toLowerCase());
        }
      });
    }

    return newKeywords;
  };

  /**
   * plainKeywords.
   *
   * Breaks apart values of selected fields into keywords.
   * @return {MongooseArray}
   * @api public
   */

  schema.methods.plainKeywords = function () {
    var self = this;

    var values = fields.map(function (field) {
      return self.get(field);
    });

    if (fn) {
      var res = fn.call(self);
      if (undefined !== res) {
        if (!Array.isArray(res)) res = [res];
        values = values.concat(res);
      }
    }

    var newKeywords = new mongoose.Types.Array([], keywordsPath, this);
    var i = values.length;

    while (i--) {
      var words = stemmer.keywordString(values[i] || '');

      words.forEach(function (word) {
        if (word) {
          if (upper)
            newKeywords.addToSet(word);
          else
            newKeywords.addToSet(word.toLowerCase());
        }
      });
    }

    return newKeywords;
  };

  /**
   * Update the keywords if any field changed.
   */

  schema.pre('save', function (next) {
    var self = this;

    // TODO: remember if we already updated index manually and don't bother redoing in that case

    var changed = this.isNew || fields.some(function (field) {
      return self.isModified(field);
    });

    if (changed) this.updateIndex();

    next();
  });
};

/**
 * Expose version.
 */

exports.version = JSON.parse(
    require('fs').readFileSync(__dirname + '/../package.json')
).version;
