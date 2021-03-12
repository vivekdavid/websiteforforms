// In practice, you might just hard code the publishable API
// key here.
fetch('/config')
  .then(function (result) {
    return result.json();
  })
  .then(function (json) {
    window.config = json;
    window.stripe = Stripe(config.publicKey);
  });

// When the form is submitted...
var submitBtn = document.querySelector('#submit');
submitBtn.addEventListener('click', function (evt) {

//getting responses to radio buttons     
var simp = document.querySelector('input[name="simple"]:checked'); 
var simple = parseInt(simp.value);

var jdivo = document.querySelector('input[name="jdiv"]:checked');
var jdiv = parseInt(jdivo.value);

var chilo = document.querySelector('input[name="child"]:checked');
var child = parseInt(chilo.value);

var custo =  document.querySelector('input[name="custody"]:checked');
var custody = parseInt(custo.value);

var propo = document.querySelector('input[name="property"]:checked');
var property = parseInt(propo.value);

var alimo  = document.querySelector('input[name="alim"]:checked');
var alim = parseInt(alimo.value);

var mediat = document.querySelector('input[name="medi"]:checked');
var medi = parseInt(mediat.value);

//changing checkout based on radio input 

if( jdiv==1){
var fetchurl='/create-checkout-session-joint'}
else if(jdiv+alim+child+custody+property+simple==0){
var fetchurl='/create-checkout-session-simple'}
else {var fetchurl='/create-checkout-session'}
  // Create the checkout session.
  fetch(fetchurl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        child: child,
	    alim:alim,// with the quantity
        property:property,
        custody:custody, 
    }),
  }).then(function (result) {
    return result.json();
  }).then(function (data) {
    // Redirect to Checkout. with the ID of the
    // CheckoutSession created on the server.
    stripe.redirectToCheckout({
      sessionId: data.sessionId,
    })
    .then(function(result) {
      // If redirection fails, display an error to the customer.
      if (result.error) {
        var displayError = document.getElementById('error-message');
        displayError.textContent = result.error.message;
      }
    });
  });
});
