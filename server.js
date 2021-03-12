const express = require('express');
const nunjucks = require('nunjucks');

const session = require('express-session')
const router = express.Router();
const bodyParser = require('body-parser');
const cookieParser= require('cookie-parser')
const uuid = require('uuid').v4 

const PORT = 4242; 
const app = express();

const { resolve } = require('path');
require('dotenv').config({ path: './.env' });

// Ensure environment variables are set (function is on the last line).
checkEnv();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(cookieParser());

app.use(session({

      secret: 'secret',
      resave: false,
      saveUninitialized: true,
      maxage: 30*24*60*60*1000, 
})); 

//raw body for verifying stripe's webhook signatures 
app.use(express.static(process.env.STATIC_DIR));
app.use(
  express.json({
    verify: function (req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    },
  })
);


var fs = require('fs');
var path = require('path');

const YOUR_DOMAIN = 'http://localhost:4242';



function replaceErrors(key, value) {
    if (value instanceof Error) {
        return Object.getOwnPropertyNames(value).reduce(function(error, key) {
            error[key] = value[key];
            return error;
        }, {});
    }
    return value;
}

function errorHandler(error) {
    console.log(JSON.stringify({error: error}, replaceErrors));

    if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors.map(function (error) {
            return error.properties.explanation;
        }).join("\n");
        console.log('errorMessages', errorMessages);
    }
    throw error;
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))

app.use('/',express.static(__dirname + '/pdf'))
console.log(__dirname)

nunjucks.configure('views',{
	autoescape:true,
	cache: false, 
	express: app 
}); 

app.set('view engine', "html"); 

app.get('/config', async (req, res) => {
  const price = await stripe.prices.retrieve(process.env.PRICE);

  res.send({
    publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
    unitAmount: price.unit_amount,
    currency: price.currency,
  });
});


app.get('/testing', (req,res) =>{
    console.log("inside the page")
    console.log(req.sessionID)
    res.send('curl worled\n')

})

// Fetch the Checkout Session ID (for displaying stuff from stripe's api ) 
app.get('/checkout-session', async (req, res) => {
  const { sessionId } = req.query;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  res.send(session);
});

app.post('/create-checkout-session', async (req, res) => {
  const domainURL = process.env.DOMAIN;
  const {child , alim, property , custody} =req.body;
  //for development, to make sure the server got everything required 
  console.log("alim",alim)
  console.log("child",child)
  console.log("property",property)
  console.log("custody", custody)  

// checking which forms to return 
let discl 
	if(property==0 && alim+child>0 ){
		discl=1, console.log(discl)}
	else if (property==1){discl=2,console.log(discl)}
	else {discl=0,console.log (discl)};	

    sess = req.session 
    sess.discl = discl 
    sess.custody = custody

     console.log ("discl is", req.session.discl)  

    //stripe checkout webservice so quantity is always one  
  const pmTypes = (process.env.PAYMENT_METHOD_TYPES || 'card').split(',').map((m) => m.trim());
  const session = await stripe.checkout.sessions.create({
    payment_method_types: pmTypes,
	metadata:{ a:discl, b:custody},
    mode: 'payment',
    line_items: [
      {
        price: process.env.PRICE,
      quantity:1,
      },
    ],
    // ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
  success_url: `${domainURL}/divorce?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${domainURL}/canceled.html`,
  });

  res.send({
    sessionId: session.id,
  });
});



app.get('/divorce', function(req, res){
  sess = req.session 
    discl = sess.discl
    custody = sess.custody
    context = {discl, custody}
// check if numbers displayed for development enviornment 
    console.log('custody is', custody)
    console.log('context is', context)
  res.render('forms.html', context);
});




//Joint divorce 
//same thing as before except returning forms for a joint divorce 

app.post('/create-checkout-session-joint', async (req, res) => {
  const domainURL = process.env.DOMAIN;
  

  const {child , alim, property , custody} =req.body;
//  const alim = req.body.alim;
//  const child= req.body.child;
  console.log("alim",alim)
  console.log("child",child)
 

let discl 
	if(property==0 && alim+child>0 ){
		discl=1, console.log(discl)}
	else if (property==1){discl=2,console.log(discl)}
	else {discl=0,console.log (discl)};	

    sess = req.session 
    sess.discl = discl 
    sess.custody = custody

  const pmTypes = (process.env.PAYMENT_METHOD_TYPES || 'card').split(',').map((m) => m.trim());
  
    const session = await stripe.checkout.sessions.create({
    payment_method_types: pmTypes,
    mode: 'payment',
    
        line_items: [
      {
        price: process.env.JPRICE,
      quantity:1,
      },
    ],
    success_url: `${domainURL}/joint`,
    cancel_url: `${domainURL}/canceled.html`,
  });

  res.send({
    sessionId: session.id,
  });
});

app.get('/joint', function(req, res){
  sess = req.session 
    discl = sess.discl
    custody = sess.custody
    context = {discl, custody}
    console.log('custody is', custody)
    console.log('context is', context)
  res.render('joint.html', context);
});



//Simple Divorce same as others but without all the docucments  

app.post('/create-checkout-session-simple', async (req, res) => {
  const domainURL = process.env.DOMAIN;
  const pmTypes = (process.env.PAYMENT_METHOD_TYPES || 'card').split(',').map((m) => m.trim());
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: pmTypes,
    mode: 'payment',
//    locale: locale,
    line_items: [
      {
        price: process.env.SPRICE,
      quantity:1,
      },
    ],
    // ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
    success_url: `${domainURL}/simple`,
    cancel_url: `${domainURL}/canceled.html`,
  });

  res.send({
    sessionId: session.id,
  });
});

app.get('/simple', function(req,res){
    req.render('simple.html')
})

// Webhook handler for asynchronous events.
app.post('/webhook', async (req, res) => {
  let data;
  let eventType;
  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    // if  signing fails for some reason  
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  if (eventType === 'checkout.session.completed') {
    console.log(`🔔  Payment received!`);
  }

  res.sendStatus(200);
});



app.get('/', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/index.html');
  res.sendFile(path);
});
 
//all the downloadable forms 
app.get('/form08adoc', function(req, res){
	res.download("./pdf/form_08a.doc",);
});

app.get('/form08apdf', function(req, res){
	res.download("./pdf/form_08a.pdf",);
});

app.get('/form10doc', function(req, res){
	res.download("./pdf/form_10.doc",);
});

app.get('/form10pdf', function(req, res){
	res.download("./pdf/form_10.pdf",);
});

app.get('/form13doc', function(req, res){
	res.download("./pdf/form_13.doc",);
});

app.get('/form13pdf', function(req, res){
	res.download("./pdf/form_13.pdf",);
});

app.get('/form13_1doc', function(req, res){
	res.download("./pdf/form_13_1.doc",);
});

app.get('/form13_1pdf', function(req, res){
	res.download("./pdf/form_13_1.pdf",);
});

app.get('/form13adoc', function(req, res){
	res.download("./pdf/form_13a.doc",);
});

app.get('/form13apdf', function(req, res){
	res.download("./pdf/form_13a.pdf",);
});

app.get('/form35_1doc', function(req, res){
	res.download("./pdf/form_35_1.doc",);
});

app.get('/form35_1pdf', function(req, res){
	res.download("./pdf/form_35_1.pdf",);
});

app.get('/form36doc', function(req, res){
	res.download("./pdf/form_36.pdf",);
});

app.get('/form36pdf', function(req, res){
	res.download("./pdf/form_36.pdf",);
});

app.get('/form ', function(req, res){
	res.download("./pdf/form_.pdf",);
});

app.get('/doc2', function(req,res){
	res.download(".pdf/doc2.pdf",);
});



var server = app.listen(PORT, function () {
    console.log('Node server is running..');
});


function checkEnv() {
  const price = process.env.PRICE;
  if(price === "price_12345" || !price) {
    console.log("You must set a Price ID in the environment variables. Please see the README.");
    process.exit(0);
  }
}
