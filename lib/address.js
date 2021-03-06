// Generated by IcedCoffeeScript 108.0.11
(function() {
  var SHA256, base58, bech32, bufeq_secure, check, check_bitcoin_segwit, check_hash, check_with_prefixes, check_zcash_sapling, decode, kbpgp, match_prefix, parse_btc_if_segwit,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  kbpgp = require('kbpgp');

  SHA256 = kbpgp.hash.SHA256;

  base58 = kbpgp.base58;

  bufeq_secure = require('pgp-utils').util.bufeq_secure;

  bech32 = require('bech32');

  decode = function(s) {
    var buf, err;
    try {
      buf = base58.decode(s);
      return [null, buf];
    } catch (_error) {
      err = _error;
      return [err, null];
    }
  };

  check_hash = function(buf) {
    var checksum1, checksum2, pkhash;
    if (buf.length < 8) {
      return new Error("address too short");
    } else {
      pkhash = buf.slice(0, -4);
      checksum1 = buf.slice(-4);
      checksum2 = (SHA256(SHA256(pkhash))).slice(0, 4);
      if (!bufeq_secure(checksum1, checksum2)) {
        return new Error("Checksum mismatch");
      } else {
        return null;
      }
    }
  };

  match_prefix = function(buf, prefixes) {
    var prefix, _i, _len;
    for (_i = 0, _len = prefixes.length; _i < _len; _i++) {
      prefix = prefixes[_i];
      if (bufeq_secure(prefix, buf.slice(0, prefix.length))) {
        return prefix;
      }
    }
    return null;
  };

  parse_btc_if_segwit = function(s) {
    var address_data, checksum, checksum_length, decoded, e, err, hrp, ret, separator, witness_version;
    if (s.slice(0, 3) !== "bc1") {
      return [null, null];
    }
    err = ret = null;
    try {
      if (s.length < 14 || s.length > 74) {
        throw new Error("address " + s + " cannot be fewer than 14 or greater than 74 characters long");
      }
      decoded = bech32.decode(s);
      hrp = decoded.prefix;
      separator = s[2];
      witness_version = decoded.words[0];
      if (!(0 <= witness_version && witness_version <= 16)) {
        throw new Error("invalid witness_version " + witness_version);
      }
      address_data = Buffer.from(bech32.fromWords(decoded.words.slice(1)), "hex");
      if (witness_version === 0 && (s.length !== 42 && s.length !== 62)) {
        throw new Error("when witness_version is 0, " + s + " must be 42 or 62 characters long");
      }
      checksum_length = s.length - hrp.length - 1 - decoded.words.length;
      if (checksum_length !== 6) {
        throw new Error("unexpected checksum");
      }
      checksum = s.slice(-checksum_length);
      ret = {
        hrp: hrp,
        separator: separator,
        witness_version: witness_version,
        address_data: address_data,
        checksum: checksum
      };
    } catch (_error) {
      e = _error;
      err = e;
    }
    return [err, ret];
  };

  exports.check = check = function(s, opts) {
    var buf, err, parsed_segwit, ret, v, versions, _ref, _ref1;
    if (opts == null) {
      opts = {};
    }
    _ref = parse_btc_if_segwit(s), err = _ref[0], parsed_segwit = _ref[1];
    if (err != null) {
      return [err, null];
    }
    if (parsed_segwit != null) {
      return [
        null, {
          version: parsed_segwit.witness_version,
          pkhash: parsed_segwit.address_data
        }
      ];
    }
    versions = opts.versions || [0, 5];
    _ref1 = decode(s), err = _ref1[0], buf = _ref1[1];
    if (err != null) {
      return [err, null];
    }
    v = buf.readUInt8(0);
    err = !(__indexOf.call(versions, v) >= 0) ? new Error("Bad version found: " + v) : check_hash(buf);
    ret = err != null ? null : {
      version: v,
      pkhash: buf.slice(1, -4)
    };
    return [err, ret];
  };

  exports.check_with_prefixes = check_with_prefixes = function(s, prefixes) {
    var buf, err, ret, _ref;
    ret = null;
    _ref = decode(s), err = _ref[0], buf = _ref[1];
    if (err == null) {
      err = check_hash(buf);
    }
    if (err == null) {
      ret = match_prefix(buf, prefixes);
      err = ret != null ? null : new Error("Bad address, doesn't match known prefixes");
    }
    return [err, ret];
  };

  exports.check_bitcoin_segwit = check_bitcoin_segwit = function(s) {
    var err, parsed, ret, _ref;
    _ref = parse_btc_if_segwit(s), err = _ref[0], parsed = _ref[1];
    if (!((err != null) || (parsed != null))) {
      return [null, null];
    }
    if (err != null) {
      return [err, null];
    }
    ret = {
      family: "bitcoin",
      type: "bitcoin",
      prefix: Buffer.from(parsed.hrp, "utf8")
    };
    return [err, ret];
  };

  exports.check_zcash_sapling = check_zcash_sapling = function(s) {
    var decoded, e, err, ret;
    if (s.slice(0, 3) !== "zs1") {
      return [null, null];
    }
    err = ret = null;
    try {
      decoded = bech32.decode(s);
      if (decoded.prefix !== "zs") {
        err = new Error("bad prefix: " + decoded.prefix);
      } else {
        ret = {
          family: "zcash",
          type: "zcash.s",
          prefix: Buffer.from("zs", "utf8")
        };
      }
    } catch (_error) {
      e = _error;
      err = e;
    }
    return [err, ret];
  };

  exports.check_btc_or_zcash = function(s) {
    var err, k, prefix, prefixes, ret, types, _ref, _ref1, _ref2;
    _ref = check_zcash_sapling(s), err = _ref[0], ret = _ref[1];
    if ((err != null) || (ret != null)) {
      return [err, ret];
    }
    _ref1 = check_bitcoin_segwit(s), err = _ref1[0], ret = _ref1[1];
    if ((err != null) || (ret != null)) {
      return [err, ret];
    }
    types = {
      "00": {
        family: "bitcoin",
        type: "bitcoin"
      },
      "05": {
        family: "bitcoin",
        type: "bitcoin"
      },
      "169a": {
        family: "zcash",
        type: "zcash.z"
      },
      "1cb8": {
        family: "zcash",
        type: "zcash.t"
      },
      "1cbd": {
        family: "zcash",
        type: "zcash.t"
      }
    };
    prefixes = (function() {
      var _results;
      _results = [];
      for (k in types) {
        _results.push(Buffer.from(k, 'hex'));
      }
      return _results;
    })();
    _ref2 = check_with_prefixes(s, prefixes), err = _ref2[0], prefix = _ref2[1];
    if (err != null) {
      return [err];
    }
    ret = types[prefix.toString('hex')];
    ret.prefix = prefix;
    return [err, ret];
  };

}).call(this);
