var argv = require("optimist").argv;
if(!argv.root) {
    console.error("need --root");
    process.exit(1);
}

var Crypto = require("crypto");
var Express = require("express");
var FS = require("fs");
var WaitGroup = require("waitgroup");
var _ = require("underscore");

var app = Express.createServer();
app.use(Express.logger("short"));
var root = argv.root;
console.log("Root is " + root);

app.get("/1/files/dropbox/*", function(req, res){
    var path = root + "/" + req.params[0];
    res.contentType(req.params[0]);
    var stream = FS.createReadStream(path);
    stream.pipe(res);
});

app.put("/1/files_put/dropbox/*", function(req, res){
    var path = root + "/" + req.params[0];
    res.contentType(req.params[0]);
    var stream = FS.createWriteStream(path);
    req.pipe(stream);
    req.on("end", function(){
        FS.stat(path, function(err, stat) {
            res.send({
                modified: stat.mtime.toUTCString()
            });
        });
    });
});

app.get("/1/metadata/dropbox/*", function(req, res){
    var wg = new WaitGroup;
    var reply = {};
    reply.contents = [];

    var path = root + "/" + req.params[0];
    var hash = Crypto.createHash("md5");
    FS.readdir(path, function(err, files){
        console.log(err, files);
        _(files).each(function(f){
            wg.add();
            var filepath = path + "/" + f;

            FS.stat(filepath, function(err, stat){
                hash.update(JSON.stringify(stat));
                reply.contents.push({
                    is_dir: stat.isDirectory(),
                    path: "/" + f,
                    modified: stat.mtime.toUTCString()
                });
                wg.done();
            });

        });

    });

    wg.wait(function(){
        reply.hash = hash.digest("hex");
        res.send(reply);
    });
});

// Catch-all
app.get("*", function(req, res){
    res.writeHead(501);
    res.end();
});

var port = process.env.PORT || 4000;
app.listen(port, function(){
    console.log("Listening on port " + port);
});
