var express = require('express');
var expressHandlebars = require('express-handlebars');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var session = require('express-session')
var bcrypt = require('bcrypt');
var co = require('co');
var mongodb = require('mongodb');
var ObjectId = mongodb.ObjectId;

var co_func = require('co-functional');

var url = 'mongodb://localhost:27017/hopefeedr';
MongoClient = mongodb.MongoClient;

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

app.use(express.static('public'));

//setup handlebars
app.engine('hbs', expressHandlebars({defaultLayout: 'main'}));
app.set('view engine', 'hbs');

app.use(function(req, res, next){

    var publicPaths = {
        "/login" : "",
        "/register" : ""
    }

    if (publicPaths[req.path] !== undefined){
        return next();
    }

    if (!req.session.user){
        return res.redirect("/login");
    }

    next();

});

app.get('/register', function(req, res) {
    res.render("register");
});

app.post('/register', function(req, res) {
    bcrypt.hash(req.body.password, 7, function(err, hash) {

        co(function* (){
            var username = req.body.username;
            var db = yield setupMongo(url);

            const user = yield db.users.findOne({username : username });

            if (!user){
                try {
                    var result = yield db.users.insert({username : username, password : hash});
                    res.redirect("/");
                } catch (e) {
                    next(e);
                } finally {

                }
            }
            db.close();
            res.redirect("/");
        });
    });
});


app.get('/login', function(req, res) {
    res.render("login");
});

app.post('/login', function(req, res, next) {

    co(function* (){
        try {
            var username = req.body.username;
            var db = yield setupMongo(url);
            const user = yield db.users.findOne({username : username });
            if (user){
                bcrypt.compare(req.body.password, user.password, function(err, match) {
                    if(match){
                        req.session.user = user;
                    }
                    res.redirect("/");
                });
            }
            db.close();
        } catch (e) {
            next(e);
        } finally {

        }
    });
});

app.get('/logout', function(req, res) {
    delete req.session.user;
    res.redirect("/");
});

app.get('/sponsorships/:id', function(req, res) {
    co(function* (){
        var id = req.params.id;
        var db = yield setupMongo(url);
        var sponsorship = yield findSponsorship(db, id);
        res.render("sponsorship", {sponsorship : sponsorship});
    });
});

function setupMongo(url){
        return co(function* (){

            var db = yield MongoClient.connect(url);

            return {
                sponsorships : db.collection("sponsorships"),
                sponsors : db.collection("sponsors"),
                children : db.collection("children"),
                users : db.collection("users"),
                close : function(){
                    db.close();
                }
            };
        });
}

function findSponsorship(db, id){
    return co(function* (){
        const sponsorship = yield db.sponsorships.findOne({_id : new ObjectId(id) });

        const sponsor = yield db.sponsors.findOne({_id : new ObjectId(sponsorship.sponsor_id) });
        const child = yield db.children.findOne({_id : new ObjectId(sponsorship.child_id) });

        return {
            id : sponsorship._id,
            sponsor : sponsor,
            child : child
        };
    });
}

app.get('/sponsorships', function(req, res, next) {
    co(function* (){
        try{
            var db = yield setupMongo(url)
            var sponsorships = yield db.sponsorships.find({}).toArray();
            var sponsorshipList = co_func.map(function * (sponsorship){

                const sponsor = yield db.sponsors.findOne({_id : new ObjectId(sponsorship.sponsor_id) })
                const child = yield db.children.findOne({_id : new ObjectId(sponsorship.child_id) })

                return {
                    id : sponsorship._id,
                    sponsor : sponsor,
                    child : child
                };
            }, sponsorships);

            var results = yield sponsorshipList;
            db.close();
            res.render("sponsorships", {sponsorships : results});

        }
        catch(err){
            next(err);
        }
    });
});

app.get('/', function(req, res){
    res.redirect('/sponsorships');
});

var port = process.env.port || 3007;
http.listen(port, function(){
    console.log('running at port :' , port)
});
