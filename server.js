if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

require('sqreen');
const express = require('express');
const { db, Users, Products, Carts, getuserbyemail, getuserbyid } = require('./db');
const path = require('path');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const bcrypt = require('bcrypt');
// var SequelizeStore = require("connect-session-sequelize")(session.Store);
const initializepassport = require('./passport-config');

initializepassport(passport, getuserbyemail, getuserbyid);

const PORT = process.env.PORT || 3000;

const app = express();

app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
	session({
		secret: process.env.SECRET_SESSION,
		resave: false,
		saveUninitialized: false,
		cookie: {
			expires: 3600000,
			httpOnly: false,
		},
		// store: new SequelizeStore({
		// 	db: sequelize,
		// 	checkExpirationInterval: 15 * 60 * 1000
		// })
	})
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.get('/', async function (req, res, next) {
	const products = await Products.findAll();

	res.render('index', { user: req.user, products });
});

app.get('/login', checknotauthenticated, function (req, res) {
	res.render('login');
});

app.get('/register', checknotauthenticated, function (req, res) {
	res.render('register');
});

app.post('/register', checknotauthenticated, async function (req, res) {
	try {
		let businessstatus = false;
		if (req.body.business) {
			businessstatus = req.body.business;
		}
		let hashpass = await bcrypt.hash(req.body.password, 10);

		const user = await Users.create({
			name: req.body.name,
			email: req.body.email,
			gender: req.body.gender,
			password: hashpass,
			business: businessstatus,
		});

		res.redirect('/login');

		console.log(user);
	} catch (err) {
		console.log(err);
		res.redirect('/register');
	}
});

app.post(
	'/login',
	checknotauthenticated,
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/login',
		failureFlash: true,
	})
);

app.post('/logout', checkauthenticated, function (req, res) {
	req.logOut();
	res.redirect('/login');
});

app.use('/add', checkauthenticated, function (req, res, next) {
	if (req.user.business == true) {
		return next();
	}
	res.redirect('/');
});

app.get('/add', function (req, res) {
	res.render('add');
});

app.post('/add', async function (req, res) {
	try {
		const product = await Products.create({
			name: req.body.name,
			manufacturer: req.body.manufacturer,
			price: req.body.price,
		});

		res.redirect('/add');
	} catch (err) {
		console.log(err);
		res.status(500).send(
			"product not added because of server side error, Try again!! <a href='/add'>return back</a>"
		);
	}
});

app.get('/cart', checkauthenticated, async function (req, res) {
	const carts = await Carts.findAll({
		include: [Users, Products],
		where: {
			userId: req.user.id,
		},
	});

	let total = 0;
	for (const c of carts) {
		total += c.product.price;
	}
	console.log(total);
	res.render('cart', { carts, total });
});

app.post('/cart', checkauthenticated, async function (req, res) {
	try {
		console.log(req.body);
		const cartitem = await Carts.create({
			userId: req.user.id,
			productId: req.body.id,
		});

		res.redirect('/');
	} catch (err) {
		console.log(err);
		res.redirect('/');
	}
});

app.post('/cartitemdelete', async function (req, res, next) {
	const cartitem = await Carts.destroy({
		where: {
			id: req.body.id,
		},
	});
	console.log(cartitem);
	res.redirect('/cart');
});

function checkauthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login');
}

function checknotauthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return res.redirect('/');
	}
	next();
}

app.listen(PORT, console.log('server started on https://shopvela.herokuapp.com/ and on port ' + PORT));
