/*!
 * mongoose-fts
 * Copyright(c) 2012 Charlie Stigler <charlie@charliestigler.com>
 * MIT Licensed
 */

/*!
 * (most code in here written for project...)
 * reds
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var natural = require('natural')
  , metaphone = natural.Metaphone.process
  , stem = natural.PorterStemmer.stem
  , stopwords = require('./stopwords')
  , noop = function(){};


exports.metaphoneString = function(str) {
  return exports.metaphoneArray(exports.stemString(str));
};

exports.stemString = function(str) {
  return exports.stem(exports.keywordString(str));
};

exports.keywordString = function(str) {
  return exports.stripStopWords(exports.words(str));
};

/**
 * Return the words in `str`.
 *
 * @param {String} str
 * @return {Array}
 * @api private
 */

exports.words = function(str){
  return String(str).trim().split(/\W+/);
};

/**
 * Stem the given `words`.
 *
 * @param {Array} words
 * @return {Array}
 * @api private
 */

exports.stem = function(words){
  var ret = [];

  for (var i = 0, len = words.length; i < len; ++i) {
    ret.push(stem(words[i]));
  }

  return ret;
};

/**
 * Strip stop words in `words`.
 *
 * @param {Array} words
 * @return {Array}
 * @api private
 */

exports.stripStopWords = function(words){
  var ret = [];

  for (var i = 0, len = words.length; i < len; ++i) {
    if (~stopwords.indexOf(words[i])) continue;
    ret.push(words[i]);
  }

  return ret;
};

/**
 * Return the given `words` mapped to the metaphone constant.
 *
 * Examples:
 *
 *    metaphone(['tobi', 'wants', '4', 'dollars'])
 *    // => { '4': '4', tobi: 'TB', wants: 'WNTS', dollars: 'TLRS' }
 *
 * @param {Array} words
 * @return {Object}
 * @api private
 */

exports.metaphoneMap = function(words){
  var obj = {};

  for (var i = 0, len = words.length; i < len; ++i) {
    obj[words[i]] = metaphone(words[i]);
  }

  return obj;
};

/**
 * Return an array of metaphone constants in `words`.
 *
 * Examples:
 *
 *    metaphone(['tobi', 'wants', '4', 'dollars'])
 *    // => ['4', 'TB', 'WNTS', 'TLRS']
 *
 * @param {Array} words
 * @return {Array}
 * @api private
 */

exports.metaphoneArray = function(words){
  var arr = []
    , constant;
  for (var i = 0, len = words.length; i < len; ++i) {
    constant = metaphone(words[i]);
    if (!~arr.indexOf(constant)) arr.push(constant);
  }
  return arr;
};

/**
 * Return a map of metaphone constant redis keys for `words`
 * and the given `key`.
 *
 * @param {String} key
 * @param {Array} words
 * @return {Array}
 * @api private
 */

exports.metaphoneKeys = function(key, words){
  return exports.metaphoneArray(words).map(function(c){
    return key + ':word:' + c;
  });
};