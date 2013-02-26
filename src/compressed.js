/**
 * Pipes compressed asset to Client, or schedules the creation of the asset
 * 
 * @param  {Object}  res     HTTP response Object
 * @param  {Object}  req     HTTP request Object
 * @param  {String}  etag    Etag header
 * @param  {String}  arg     Response body
 * @param  {Number}  code    Response status code
 * @param  {Object}  headers HTTP headers
 * @param  {Boolean} local   [Optional] Indicates arg is a file path, default is false
 * @return {Objet}           Instance
 */
factory.prototype.compressed = function (res, req, etag, arg, code, headers, local) {
	local           = (local === true);
	var self        = this,
	    compression = this.compression(req.headers["user-agent"], req.headers["accept-encoding"]),
	    raw;

	// Firing probe
	dtp.fire("compressed", function (p) {
		return [etag, local ? "local" : "proxy", req.headers.host, req.url];
	});

	// Local asset, piping result directly to Client
	if (local) {
		// Firing probe
		dtp.fire("respond", function (p) {
			return [req.headers.host, req.method, req.url, code];
		});

		if (compression !== null) {
			res.setHeader("Content-Encoding", compression);
			self.cached(etag, compression, function (ready, npath) {
				if (ready) {
					self.headers(res, req, code, headers);
					raw = fs.createReadStream(npath);
					raw.pipe(res);
				}
				else {
					self.cache(etag, arg, compression);
					raw = fs.createReadStream(arg);
					raw.pipe(zlib[REGEX_DEF.test(compression) ? "createDeflate" : "createGzip"]()).pipe(res);
				}
			});
		}
		else {
			raw = fs.createReadStream(arg);
			util.pump(raw, res);
		}
	}
	// Proxy response
	else {
		if (compression !== null) {
			res.setHeader("Content-Encoding", compression);
			self.cached(etag, compression, function (ready, npath) {
				if (ready) {
					// Firing probe
					dtp.fire("respond", function (p) {
						return [req.headers.host, req.method, req.url, code];
					});

					self.headers(res, req, code, headers);
					raw = fs.createReadStream(npath);
					raw.pipe(res);
				}
				else {
					self.cache(etag, arg, compression, true);
					self.respond(res, req, arg, code, headers);
				}
			});
		}
		else this.respond(res, req, arg, code, headers, false);
	}

	return this;
};
