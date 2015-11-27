// Setup basic express server
/*
var http = require('http');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser')
var ejs = require('ejs');
var app = express();
//app.use(bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
var router = express.Router();
app.use(express.static('public'));
app.use(router);
var port = process.env.PORT || 3000;
router.get("/",function(req,res){
  res.send("<h1>hello heroku node.js world</h1>");
});

http.createServer(app).listen(port, function(){
  console.log('server run');
});
*/

var http = require('http');
var express = require('express');
var app = express();
var path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var xml2json = require("node-xml2json");
var request = require("request");

// connect database
//mongoose.connect(process.env.MONGO_DB);
//mongoose.connect("mongodb://heroku_6ps1dp84:1b58q0erdlqrrh5ut1d28lqsoe@ds055584.mongolab.com:55584/heroku_6ps1dp84");
mongoose.connect("mongodb://yoon:yoon@ds053944.mongolab.com:53944/yoon_common");
var db = mongoose.connection;
db.once("open",function () {
  console.log("DB connected!");
});
db.on("error",function (err) {
  console.log("DB ERROR :", err);
});

// model setting
var searchSchema = mongoose.Schema({
	query : {type:String, required:true},
	sort: {type:String, required:true},
	memo: {type:String, required:true},
	createdAt: {type:Date, default:Date.now},
	updatedAt: Date
});

var Search = mongoose.model('search', searchSchema);

// view setting
app.set("view engine", 'ejs');

// set middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride("_method"));

// set routes

app.get('/', function(req,res){
	Search.find({}).sort('-createdAt').exec(function (err, search) {
		if(err) return res.json({success:false, message:err});
		res.render("search/start", {data:search});
	});
});

app.get('/loginproc', function(req,res){
	res.redirect('/search');
});

app.get('/search', function(req,res){
	Search.find({}).sort('-createdAt').exec(function (err, search) {
		if(err) return res.json({success:false, message:err});
		res.render("search/index", {data:search});
	});
});

app.get('/search/new', function(req,res){
	res.render("search/new");
});

// create
app.post('/search', function(req,res){
	//console.log(req.body);
	Search.create(req.body.post, function (err,post) {
		if(err) return res.json({success:false, message:err});
		res.redirect('/search');
	});
});

// show
app.get('/search/:id', function(req,res){
	//console.log("/search/:id"); 

	Search.findById(req.params.id, function (err, post) {
		if(err) return res.json({success:false, message:err});

		var json;
		var str = post.query.replace(/ /gi,"+");
		var options = { 
		   host: 'openapi.naver.com', 
		   port: 80, 
		   path: '/search?key=425d3bb6d7450a1893026e0596291bd7&query='+str+'&display=5&start=1&target=shop&sort='+post.sort, 
		   method: 'POST' 
		}; 

		res.render("search/show", {data:post, page:1});	
	});
});

// edit
app.get('/search/:id/edit', function(req,res){
	//console.log("/search/:id/edit"); 
	Search.findById(req.params.id, function (err, post) {
		if(err) return res.json({success:false, message:err});
		//res.json({success:true, data:post});
		res.render("search/edit", {data:post});
	});
});

// update
app.put('/search/:id', function(req,res){
	req.body.post.updatedAt=Date.now();
	Search.findByIdAndUpdate(req.params.id, req.body.post, function (err,post) {
		if(err) return res.json({success:false, message:err});
		//res.json({success:true, message:post._id+" updated"});
		res.redirect('/search/' + req.params.id);
	});
});

// destory
app.delete('/search/:id', function(req,res){
	Search.findByIdAndRemove(req.params.id, function (err,post) {
		if(err) return res.json({success:false, message:err});
		//res.json({success:true, message:post._id+" deleted"});
		res.redirect('/search');
	});
});

app.post('/naversearch', function(req,res){
	//console.log(req.body);

		var json;
		var str = req.body.query.replace(/ /gi,"+");
		var cnt = 0;
		var xml;
		var options = { 
		   host: 'openapi.naver.com', 
		   port: 80, 
		   path: '/search?key=425d3bb6d7450a1893026e0596291bd7&query='+str+'&display=100&start='+req.body.page+'&target=shop&sort='+req.body.sort, 
		   method: 'POST' 
		}; 

		var req2 = http.request(options, function(res2) { 
		   res2.setEncoding('utf8'); 
		   res2.on('data', function (chunk) { 
				xml += chunk;
		   }); 

		  res2.on('end', function () {
	  		json = xml2json.parser(xml);

		  	if (res2.statusCode == 200)
		  	{
		  		//console.log("data"+JSON.stringify(json)); 
		        res.json({success:true, data:json.rss});
		  	}else
		  	{
				//console.log("data"+JSON.stringify(json.rss)); 
				res.json({success:false, message:"error"});
		  	}
			
			//res.render("search/show", {data:post, list:json.rss.channel});
		  });	   
		}); 
		req2.on('error', function(e) { 
		   console.log('problem with request: ' + e.message); 
		}); 
		// write data to request body 
		req2.write('data\n'); 
		req2.end(); 
});


// start server
app.listen(process.env.PORT || 8000, function(){
  console.log('Server On!');
});

process.on('uncaughtException', function (err) {
 console.log('Caught exception: ' + err);
 // 추후 trace를 하게 위해서 err.stack 을 사용하여 logging하시기 바랍니다.
 // Published story에서 beautifule logging winston 참조
});