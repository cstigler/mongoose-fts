/*!
 * mongoose-fts
 * Copyright(c) 2012 Charlie Stigler <charlie@charliestigler.com>
 * MIT Licensed
 */

/*!
 * (some code in here written for project...)
 * mongoose-keywordize
 * Copyright(c) 2012 aheckmann
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
    , upper = !! options.upper // if true, keywords will not be lowercased
    , keyType = options.keyType !== undefined ? options.keyType : 'metaphone';

  schema.add({ _keywords: [String] });

  schema.path('_keywords').index(true);

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

    switch(searchType) {
      case 'or':
        return mongoose.Model.find.call(this, { _keywords: { $all: qWords } }, callback);
        break;

      case 'and':
        return mongoose.Model.find.call(this, { _keywords: { $in: qWords } }, callback);
        break;

      default:
        throw new Error('Error: Invalid search type');
    }
  };

  schema.methods.updateIndex = function() {
    switch(keyType) {
      case 'metaphone':
        return this.metaphonize();

      case 'stem':
        return this.stemize();

      case 'plain':
        return this.keywordize();
    }
  };

  /**
   * Keywordize.
   *
   * Breaks apart field values into separate keywords.
   * @return {MongooseArray}
   * @api public
   */

  schema.methods.keywordize = function () {
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

    this.set('_keywords', []);
    var keywords = this._keywords;
    var i = values.length;

    while (i--) {
      var words = stemmer.keywordString(values[i] || '')

      words.forEach(function (word) {
        if (word) {
          if (upper)
            keywords.addToSet(word);
          else
            keywords.addToSet(word.toLowerCase());
        }
      });
    }

    return keywords;
  };

 /**
   * Stemize.
   *
   * Breaks apart field values into keywords, then stems them.
   * @return {MongooseArray}
   * @api public
   */

  schema.methods.stemize = function () {
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

    this.set('_keywords', []);
    var keywords = this._keywords;
    var i = values.length;

    while (i--) {
      var stemmed = stemmer.stemString(values[i] || '');

      stemmed.forEach(function (stem) {
        if (stem) {
          if (upper)
            keywords.addToSet(stem);
          else
            keywords.addToSet(stem.toLowerCase());
        }
      });
    }

    return keywords;
  };

  /**
   * Metaphonize.
   *
   * Breaks apart field values into keywords, then stems them and processes with metaphone.
   * @return {MongooseArray}
   * @api public
   */

  schema.methods.metaphonize = function () {
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

    this.set('_keywords', []);
    var keywords = this._keywords;
    var i = values.length;

    while (i--) {
      var processed = stemmer.metaphoneString(values[i] || '');

      processed.forEach(function (mKey) {
        if (mKey) {
          keywords.addToSet(mKey);
        }
      });
    }

    return keywords;
  };

  /**
   * Update the keywords if any field changed.
   */

  schema.pre('save', function (next) {
    var self = this;

    // TODO: remember if we already keywordized() manually and don't bother redoing in that case

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
